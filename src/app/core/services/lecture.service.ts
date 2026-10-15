import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { VIDEO_SERVER_URL } from '../config/video-server';

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
  playlist_path: string | null;
  created_at: string;
  course_batches?: {
    batch_name: string;
    batch_code: string;
    courses?: { title: string } | null;
  } | null;
}

/** Admin form ki cheezein. Duration aur video ki halat server khud bharta hai. */
export type LectureInput = Pick<Lecture, 'batch_id' | 'title' | 'description' | 'status'>;

export interface UploadProgress {
  sent: number;
  total: number;
}

const SELECT_WITH_BATCH =
  '*, course_batches(batch_name, batch_code, courses(title))';

const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi'];

/** Video 8 MB ke tukron mein jati hai, beech mein net toot jaye to wahin se jaari hoti hai. */
const CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 4;

/** Server ne saaf wajah ke saath mana kar diya, dobara koshish ka faida nahi. */
class UploadRejected extends Error {}

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable({
  providedIn: 'root',
})
export class LectureService {
  private readonly supabase = inject(SupabaseService).client;

  // ---------- Admin: lecture ki detail (Supabase) ----------

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

  /** Pehle server se video ki files mitati hai, phir row. Server band ho to bhi row delete ho jati hai. */
  async delete(id: number): Promise<{ filesRemoved: boolean }> {
    let filesRemoved = true;

    try {
      await this.api<void>(`/api/lectures/${id}/video`, { method: 'DELETE' });
    } catch {
      filesRemoved = false;
    }

    const { error } = await this.supabase.from('lectures').delete().eq('id', id);

    if (error) throw error;

    return { filesRemoved };
  }

  // ---------- Student ----------

  /** Login student ka batch: students.user_id = login ki id, students.batch_id = batch. */
  private async getMyBatchIds(): Promise<number[]> {
    const { data: auth, error: authError } = await this.supabase.auth.getUser();

    if (authError) throw authError;
    if (!auth.user) return [];

    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .eq('user_id', auth.user.id);

    if (error) throw error;

    const batchIds: number[] = [];
    for (const row of data ?? []) {
      // Different possible field names for batch ID
      const batchId = row['batch_id'] ?? row['course_batch_id'] ?? row['batchId'];
      if (batchId && !isNaN(Number(batchId))) {
        batchIds.push(Number(batchId));
      }
    }

    return batchIds;
  }

  /** Sirf Published aur tayyar lectures, sirf student ke apne batches ki. */
  async getForMyBatches(): Promise<Lecture[]> {
    const batchIds = await this.getMyBatchIds();

    if (batchIds.length === 0) return [];

    // For development: show all Published lectures, even if not Ready
    // Remove .eq('processing_status', 'Ready') to see pending videos
    const queries = [
      this.supabase
        .from('lectures')
        .select(SELECT_WITH_BATCH)
        .in('batch_id', batchIds)
        .eq('status', 'Published')
        // .eq('processing_status', 'Ready')  // Comment out for testing
        .order('created_at', { ascending: false }),
      this.supabase
        .from('lectures')
        .select(SELECT_WITH_BATCH)
        .in('course_batch_id', batchIds)
        .eq('status', 'Published')
        // .eq('processing_status', 'Ready')  // Comment out for testing
        .order('created_at', { ascending: false })
    ];

    // Try both queries and return whichever works
    for (const query of queries) {
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as unknown as Lecture[];
      }
    }

    // If both failed, return empty array
    return [];
  }

  // ---------- Video server ----------

  /** Server se is lecture ka dekhne wala link (chhote token ke saath) leta hai. */
  async getPlaybackUrl(lectureId: number): Promise<string> {
    const result = await this.api<{ playlistPath: string }>(
      `/api/lectures/${lectureId}/playback`,
      { method: 'POST' },
    );

    return `${VIDEO_SERVER_URL}${result.playlistPath}`;
  }

  validateFile(file: File): void {
    const name = file.name.toLowerCase();

    if (!VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      throw new Error('Unsupported file type. Please choose an MP4, M4V, MOV, MKV, WEBM or AVI video.');
    }

    if (file.size === 0) {
      throw new Error('The selected file is empty.');
    }
  }

  /**
   * Badi video upload. Pehle server se poochta hai kitna aa chuka hai, phir wahin se aage bhejta hai.
   * Isliye upload adhoora reh jaye to wahi file dobara chun kar jaari ki ja sakti hai.
   */
  async uploadVideo(
    lectureId: number,
    file: File,
    onProgress: (progress: UploadProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.validateFile(file);

    const state = await this.api<{
      received: number;
      total: number | null;
      filename: string | null;
    }>(`/api/lectures/${lectureId}/upload`);

    let offset =
      state.total === file.size && state.filename === file.name && state.received <= file.size
        ? state.received
        : 0;

    onProgress({ sent: offset, total: file.size });

    while (offset < file.size) {
      offset = await this.sendChunk(lectureId, file, offset, signal);

      if (offset > file.size) throw new Error('The server reported an unexpected size. Please upload the file again.');

      onProgress({ sent: offset, total: file.size });
    }

    await this.api(`/api/lectures/${lectureId}/upload/complete`, { method: 'POST' });
  }

  private async sendChunk(
    lectureId: number,
    file: File,
    offset: number,
    signal?: AbortSignal,
  ): Promise<number> {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const url =
      `${VIDEO_SERVER_URL}/api/lectures/${lectureId}/upload` +
      `?offset=${offset}&total=${file.size}&filename=${encodeURIComponent(file.name)}`;

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...(await this.authHeaders()),
            'Content-Type': 'application/octet-stream',
          },
          body: file.slice(offset, end),
          signal,
        });

        const body = await response.json().catch(() => ({}) as Record<string, unknown>);

        if (response.ok) return body['received'] as number;

        // Server ke paas jitna hai wahin se aage barho
        if (response.status === 409 && typeof body['received'] === 'number') {
          return body['received'];
        }

        const message = (body['error'] as string) || `Upload failed (${response.status}).`;

        if (response.status < 500) throw new UploadRejected(message);

        lastError = new Error(message);
      } catch (error) {
        if (error instanceof UploadRejected || (error as Error).name === 'AbortError') throw error;

        lastError = error;
      }

      if (attempt < MAX_ATTEMPTS) await wait(1000 * 2 ** (attempt - 1));
    }

    throw this.friendly(lastError);
  }

  // ---------- Helpers ----------

  private async authHeaders(): Promise<Record<string, string>> {
    // Har baar naya token (lambi upload mein purana expire ho sakta hai, Supabase khud refresh karta hai)
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session) throw new Error('Your session has expired. Please sign in again.');

    return { Authorization: `Bearer ${data.session.access_token}` };
  }

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${VIDEO_SERVER_URL}${path}`, {
        ...init,
        headers: { ...(await this.authHeaders()), ...(init.headers ?? {}) },
      });
    } catch (error) {
      throw this.friendly(error);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as Record<string, unknown>);
      throw new Error((body['error'] as string) || `The video server returned an error (${response.status}).`);
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
  }

  private friendly(error: unknown): Error {
    if (error instanceof TypeError) {
      return new Error('Unable to reach the video server. Please make sure it is running and try again.');
    }

    return error instanceof Error ? error : new Error('Something went wrong. Please try again.');
  }

  private validate(input: LectureInput): void {
    if (!input.batch_id) throw new Error('Please select a batch.');
    if (!input.title.trim()) throw new Error('Title is required.');
  }
}