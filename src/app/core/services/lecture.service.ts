import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type LectureStatus = 'Published' | 'Drafted';
export type ProcessingStatus = 'Pending' | 'Uploading' | 'Processing' | 'Ready' | 'Failed';

export interface Lecture {
  id: number;
  batch_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  status: LectureStatus;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_error: string | null;
  /** Ab ye video ka Supabase Storage path hai. */
  playlist_path: string | null;
  created_at: string;
  course_batches?: {
    batch_name: string;
    batch_code: string;
    courses?: { title: string } | null;
  } | null;
}

export type LectureInput = Pick<Lecture, 'batch_id' | 'title' | 'description' | 'status'>;

export interface UploadProgress {
  sent: number;
  total: number;
}

const SELECT_WITH_BATCH = '*, course_batches(batch_name, batch_code, courses(title))';

const BUCKET = 'lecture-videos';
const MAX_VIDEO_MB = 50; // SQL mein bucket limit bhi yehi hai
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const SIGNED_URL_SECONDS = 12 * 60 * 60;
const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
};

const extensionOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
};

export function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

@Injectable({
  providedIn: 'root',
})
export class LectureService {
  private readonly supabase = inject(SupabaseService).client;

  // ---------- Admin: lecture ki detail ----------

  async getAll(): Promise<Lecture[]> {
    const { data, error } = await this.supabase
      .from('lectures')
      .select(SELECT_WITH_BATCH)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []) as unknown as Lecture[];
  }

  async create(input: LectureInput): Promise<Lecture> {
    this.validate(input);

    const { data, error } = await this.supabase
      .from('lectures')
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    return data as Lecture;
  }

  async update(id: number, input: LectureInput): Promise<Lecture> {
    this.validate(input);

    const { data, error } = await this.supabase
      .from('lectures')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data as Lecture;
  }

  /** Pehle storage se video mitati hai, phir row. */
  async delete(id: number): Promise<{ filesRemoved: boolean }> {
    let filesRemoved = true;

    const { data: row } = await this.supabase
      .from('lectures')
      .select('playlist_path')
      .eq('id', id)
      .maybeSingle();

    const path = (row as { playlist_path: string | null } | null)?.playlist_path;
    if (path) filesRemoved = await this.removeFiles([path]);

    const { error } = await this.supabase.from('lectures').delete().eq('id', id);
    if (error) throw error;

    return { filesRemoved };
  }

  // ---------- Student ----------

  private async getMyBatchIds(): Promise<number[]> {
    const { data: auth, error: authError } = await this.supabase.auth.getUser();

    if (authError) throw authError;
    if (!auth.user) return [];

    const { data, error } = await this.supabase
      .from('students')
      .select('batch_id')
      .eq('user_id', auth.user.id);

    if (error) throw error;

    return (data ?? [])
      .map((row) => Number((row as { batch_id: number | null }).batch_id))
      .filter((id) => id > 0);
  }

  /** Student ke apne batches ki Published lectures. */
  async getForMyBatches(): Promise<Lecture[]> {
    const batchIds = await this.getMyBatchIds();
    if (batchIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('lectures')
      .select(SELECT_WITH_BATCH)
      .in('batch_id', batchIds)
      .eq('status', 'Published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []) as unknown as Lecture[];
  }

  // ---------- Video ----------

  /** Video ka dekhne wala link (12 ghante chalta hai). */
  async getPlaybackUrl(lectureId: number): Promise<string> {
    const { data: row, error } = await this.supabase
      .from('lectures')
      .select('playlist_path')
      .eq('id', lectureId)
      .maybeSingle();

    if (error) throw error;

    const path = (row as { playlist_path: string | null } | null)?.playlist_path;
    if (!path) throw new Error('This video is not available yet.');

    const { data, error: signError } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);

    if (signError || !data?.signedUrl) {
      throw new Error('You do not have access to this video, or it has been removed.');
    }

    return data.signedUrl;
  }

  validateFile(file: File): void {
    if (!CONTENT_TYPES[extensionOf(file.name)]) {
      throw new Error('Unsupported file type. Please choose an MP4 (H.264) or WebM video.');
    }

    if (file.size === 0) {
      throw new Error('The selected file is empty.');
    }

    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        `This video is ${formatBytes(file.size)}. The maximum allowed size is ${MAX_VIDEO_MB} MB.`,
      );
    }
  }

  /** Video seedha Supabase Storage mein upload hoti hai, phir lecture "Ready" ho jati hai. */
  async uploadVideo(
    lectureId: number,
    file: File,
    onProgress: (progress: UploadProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.validateFile(file);
    onProgress({ sent: 0, total: file.size });

    const { data: existing } = await this.supabase
      .from('lectures')
      .select('processing_status, playlist_path')
      .eq('id', lectureId)
      .maybeSingle();

    const current = existing as { processing_status: string; playlist_path: string | null } | null;
    const wasReady = current?.processing_status === 'Ready';
    const oldPath = current?.playlist_path ?? null;

    if (!wasReady) await this.setUploadState(lectureId, 'Uploading');

    const seconds = await this.readDuration(file);
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_');
    const path = `${lectureId}/${Date.now()}-${safeName}`;

    const upload = this.supabase.storage.from(BUCKET).upload(path, file, {
      contentType: CONTENT_TYPES[extensionOf(file.name)],
      cacheControl: '3600',
      upsert: false,
    });

    let result;
    try {
      result = await this.raceAbort(upload, signal);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // Upload peeche chalta rahe to bhi adhoori file mita do
        void upload.then(
          (r) => {
            if (!r.error) void this.removeFiles([path]);
          },
          () => undefined,
        );
        if (!wasReady) await this.setUploadState(lectureId, 'Pending');
      }
      throw e;
    }

    if (result.error) {
      const message = result.error.message || 'The upload failed. Please try again.';
      if (!wasReady) await this.setUploadState(lectureId, 'Failed', message);
      throw new Error(message);
    }

    const patch: Record<string, unknown> = {
      processing_status: 'Ready',
      processing_progress: 100,
      processing_error: null,
      playlist_path: path,
    };
    if (seconds > 0) patch['duration_minutes'] = Math.max(1, Math.round(seconds / 60));

    const { error } = await this.supabase.from('lectures').update(patch).eq('id', lectureId);
    if (error) throw error;

    // Video badli ho to purani file hata do
    if (oldPath && oldPath !== path) void this.removeFiles([oldPath]);

    onProgress({ sent: file.size, total: file.size });
  }

  // ---------- Helpers ----------

  private async setUploadState(
    id: number,
    status: ProcessingStatus,
    message: string | null = null,
  ): Promise<void> {
    await this.supabase
      .from('lectures')
      .update({ processing_status: status, processing_progress: 0, processing_error: message })
      .eq('id', id);
  }

  private async removeFiles(paths: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage.from(BUCKET).remove(paths);
      return !error;
    } catch {
      return false;
    }
  }

  private raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;

    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

      if (signal.aborted) return abort();

      signal.addEventListener('abort', abort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }

  /** Browser se video ka length (seconds). Na mile to 0. */
  private readDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');

      const done = (value: number) => {
        URL.revokeObjectURL(url);
        video.removeAttribute('src');
        video.load();
        resolve(value);
      };

      video.preload = 'metadata';
      video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : 0);
      video.onerror = () => done(0);
      video.src = url;
    });
  }

  private validate(input: LectureInput): void {
    if (!input.batch_id) throw new Error('Please select a batch.');
    if (!input.title.trim()) throw new Error('Title is required.');
  }
}
