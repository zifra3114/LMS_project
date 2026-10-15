import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type LiveClassStatus = 'Scheduled' | 'Cancelled';

export interface LiveClass {
  id: number;
  batch_id: number;
  title: string;
  description: string;
  meeting_link: string;
  scheduled_at: string; // ISO timestamp
  duration_minutes: number;
  status: LiveClassStatus;
  created_at: string;
  course_batches?: {
    batch_name: string;
    batch_code: string;
    courses?: { title: string } | null;
  } | null;
}

export type LiveClassInput = Omit<LiveClass, 'id' | 'created_at' | 'course_batches'>;

const SELECT_WITH_BATCH =
  '*, course_batches(batch_name, batch_code, courses(title))';

@Injectable({
  providedIn: 'root',
})
export class LiveClassService {
  private readonly supabase = inject(SupabaseService).client;

  // ---------- Admin ----------

  async getAll(): Promise<LiveClass[]> {
    const { data, error } = await this.supabase
      .from('live_classes')
      .select(SELECT_WITH_BATCH)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;

    return (data ?? []) as unknown as LiveClass[];
  }

  async create(input: LiveClassInput): Promise<LiveClass> {
    this.validate(input);

    const { data, error } = await this.supabase
      .from('live_classes')
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    return data as LiveClass;
  }

  async update(id: number, input: LiveClassInput): Promise<LiveClass> {
    this.validate(input);

    const { data, error } = await this.supabase
      .from('live_classes')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data as LiveClass;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase.from('live_classes').delete().eq('id', id);

    if (error) throw error;
  }

  // ---------- Student ----------

  /**
   * Student ka batch ID nikalta hai students table se.
   * students.user_id = login user ki id
   */
  async getMyBatchIds(): Promise<number[]> {
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

  async getForMyBatches(): Promise<LiveClass[]> {
    const batchIds = await this.getMyBatchIds();

    if (batchIds.length === 0) return [];

    // Try both batch_id and course_batch_id field names
    const queries = [
      this.supabase
        .from('live_classes')
        .select(SELECT_WITH_BATCH)
        .in('batch_id', batchIds)
        .order('scheduled_at', { ascending: true }),
      this.supabase
        .from('live_classes')
        .select(SELECT_WITH_BATCH)
        .in('course_batch_id', batchIds)
        .order('scheduled_at', { ascending: true })
    ];

    // Try both queries and return whichever works
    for (const query of queries) {
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as unknown as LiveClass[];
      }
    }

    // If both failed, return empty array
    return [];
  }

  // ---------- Helpers ----------

  private validate(input: LiveClassInput): void {
    if (!input.batch_id) throw new Error('Please select a batch.');
    if (!input.title.trim()) throw new Error('Title is required.');
    if (!input.scheduled_at) throw new Error('Class date and time are required.');
    if (!/^https?:\/\//i.test(input.meeting_link.trim())) {
      throw new Error('Meeting link must start with http:// or https://');
    }
    if (!input.duration_minutes || input.duration_minutes <= 0) {
      throw new Error('Duration must be greater than 0.');
    }
  }
}