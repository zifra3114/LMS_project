import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type AssignmentStatus = 'open' | 'closed';
export type SubmissionStatus = 'submitted' | 'checked';

export interface AssignmentRecord {
  id: number;
  course_id: number;
  batch_id: number | null;
  title: string;
  description: string | null;
  attachment_url: string | null;
  total_marks: number;
  deadline: string | null;
  status: AssignmentStatus;
  created_at: string;
}

export interface AssignmentDraft {
  course_id: number;
  batch_id: number | null;
  title: string;
  description: string;
  attachment_url: string | null;
  total_marks: number;
  deadline: string | null;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: string | null;
  student_name: string | null;
  student_email: string | null;
  content: string | null;
  file_url: string | null;
  submitted_at: string;
  marks: number | null;
  feedback: string | null;
  status: SubmissionStatus;
}

export interface AssignmentCourseOption {
  id: number;
  title: string;
}

export interface AssignmentBatchOption {
  id: number;
  course_id: number;
  batch_name: string;
  batch_code: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssignmentService {
  private readonly supabase = inject(SupabaseService).client;

  // Must match the bucket name in Supabase Storage exactly.
  private readonly bucketName = 'assignments';
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  // ---------------- HELPERS ----------------

  private isExpired(deadline: string | null): boolean {
    if (!deadline) return false;

    const time = new Date(deadline).getTime();

    if (!Number.isFinite(time)) {
      throw new Error('Invalid assignment deadline.');
    }

    return time <= Date.now();
  }

  /** Open assignments whose deadline has passed are closed automatically. */
  private async closeExpiredAssignments(): Promise<void> {
    const { error } = await this.supabase
      .from('assignments')
      .update({ status: 'closed' })
      .eq('status', 'open')
      .not('deadline', 'is', null)
      .lte('deadline', new Date().toISOString());

    if (error) {
      throw new Error(`Unable to close expired assignments: ${error.message}`);
    }
  }

  // ---------------- LOOKUPS ----------------

  async getCourses(): Promise<AssignmentCourseOption[]> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('id, title')
      .order('title');

    if (error) throw new Error(error.message);

    return (data ?? []) as AssignmentCourseOption[];
  }

  async getAllBatches(): Promise<AssignmentBatchOption[]> {
    const { data, error } = await this.supabase
      .from('course_batches')
      .select('id, course_id, batch_name, batch_code')
      .order('batch_name', { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as AssignmentBatchOption[];
  }

  // ---------------- READ ----------------

  async getAssignments(): Promise<AssignmentRecord[]> {
    await this.closeExpiredAssignments();

    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []) as AssignmentRecord[];
  }

  async getAssignment(id: number): Promise<AssignmentRecord> {
    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    return data as AssignmentRecord;
  }

  // ---------------- IMAGE UPLOAD ----------------

  async uploadImage(file: File): Promise<string> {
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG and WebP images are allowed.');
    }

    if (file.size === 0 || file.size > this.maxImageSize) {
      throw new Error('Image must be greater than 0 bytes and 5 MB or less.');
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    // Bucket is already called "assignments", so no extra folder prefix needed.
    const path = `${crypto.randomUUID()}.${extensionByType[file.type]}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes('bucket not found')) {
        throw new Error(
          `Storage bucket "${this.bucketName}" was not found. Check the bucket name in Supabase.`,
        );
      }

      if (message.includes('row-level security') || message.includes('policy')) {
        throw new Error(
          'Upload blocked by storage policy. Add an INSERT policy for the "assignments" bucket.',
        );
      }

      throw new Error(error.message);
    }

    const { data: publicData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    if (!publicData.publicUrl) {
      throw new Error('Could not generate the image URL.');
    }

    return publicData.publicUrl;
  }

  // ---------------- CREATE / UPDATE / DELETE ----------------

  async createAssignment(draft: AssignmentDraft): Promise<AssignmentRecord> {
    this.validateDraft(draft);

    if (this.isExpired(draft.deadline)) {
      throw new Error('Deadline must be in the future.');
    }

    const { data, error } = await this.supabase
      .from('assignments')
      .insert({
        course_id: draft.course_id,
        batch_id: draft.batch_id ?? null,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        attachment_url: draft.attachment_url || null,
        total_marks: draft.total_marks,
        deadline: draft.deadline || null,
        status: 'open',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return data as AssignmentRecord;
  }

  async updateAssignment(id: number, draft: AssignmentDraft): Promise<void> {
    this.validateDraft(draft);

    const { error } = await this.supabase
      .from('assignments')
      .update({
        course_id: draft.course_id,
        batch_id: draft.batch_id ?? null,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        attachment_url: draft.attachment_url || null,
        total_marks: draft.total_marks,
        deadline: draft.deadline || null,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async deleteAssignment(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ---------------- OPEN / CLOSE ----------------

  async closeAssignment(id: number): Promise<void> {
    const { data, error } = await this.supabase
      .from('assignments')
      .update({ status: 'closed' })
      .eq('id', id)
      .eq('status', 'open')
      .select('id');

    if (error) throw new Error(error.message);

    if (!data?.length) {
      throw new Error('Assignment could not be closed. Please refresh and try again.');
    }
  }

  /**
   * Reopens a closed assignment.
   * If the deadline has already passed, a new future deadline is required.
   */
  async reopenAssignment(id: number, newDeadline?: string | null): Promise<void> {
    const current = await this.getAssignment(id);

    let deadline = current.deadline;

    if (newDeadline) {
      deadline = newDeadline;
    }

    if (this.isExpired(deadline)) {
      throw new Error('Deadline has expired. Choose a new future deadline to reopen.');
    }

    const { data, error } = await this.supabase
      .from('assignments')
      .update({ status: 'open', deadline })
      .eq('id', id)
      .eq('status', 'closed')
      .select('id');

    if (error) throw new Error(error.message);

    if (!data?.length) {
      throw new Error('Assignment could not be reopened. Please refresh and try again.');
    }
  }

  // ---------------- SUBMISSIONS ----------------

  async getSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []) as AssignmentSubmission[];
  }

  async gradeSubmission(
    submissionId: number,
    marks: number,
    feedback: string,
    totalMarks: number,
  ): Promise<void> {
    if (!Number.isFinite(marks) || marks < 0) {
      throw new Error('Marks cannot be negative.');
    }

    if (marks > totalMarks) {
      throw new Error(`Marks cannot exceed total marks (${totalMarks}).`);
    }

    const { error } = await this.supabase
      .from('assignment_submissions')
      .update({
        marks,
        feedback: feedback.trim() || null,
        status: 'checked',
      })
      .eq('id', submissionId);

    if (error) throw new Error(error.message);
  }

  // ---------------- VALIDATION ----------------

  private validateDraft(draft: AssignmentDraft): void {
    if (!draft.title.trim()) {
      throw new Error('Assignment title is required.');
    }

    if (!Number.isInteger(draft.course_id) || draft.course_id <= 0) {
      throw new Error('Please select a valid course.');
    }

    if (
      draft.batch_id !== null &&
      (!Number.isInteger(draft.batch_id) || draft.batch_id <= 0)
    ) {
      throw new Error('Please select a valid batch.');
    }

    if (!Number.isInteger(draft.total_marks) || draft.total_marks <= 0) {
      throw new Error('Total marks must be greater than zero.');
    }

    if (draft.deadline && !Number.isFinite(new Date(draft.deadline).getTime())) {
      throw new Error('Invalid assignment deadline.');
    }
  }

  // ---------------- STUDENT METHODS ----------------

  /** Student ka batch ID nikalta hai students table se */
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
      const batchId = row['batch_id'] ?? row['course_batch_id'] ?? row['batchId'];
      if (batchId && !isNaN(Number(batchId))) {
        batchIds.push(Number(batchId));
      }
    }

    return batchIds;
  }

  /** Student ke liye open assignments */
  async getAssignmentsForStudent(): Promise<AssignmentRecord[]> {
    await this.closeExpiredAssignments();

    const batchIds = await this.getMyBatchIds();
    if (batchIds.length === 0) return [];

    // Try both batch_id and course_batch_id
    const queries = [
      this.supabase
        .from('assignments')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false }),
      this.supabase
        .from('assignments')
        .select('*')
        .in('course_batch_id', batchIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
    ];

    for (const query of queries) {
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as AssignmentRecord[];
      }
    }

    return [];
  }
}