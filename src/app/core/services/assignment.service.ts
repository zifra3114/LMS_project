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

  // Student submission files
  private readonly submissionTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly maxSubmissionSize = 10 * 1024 * 1024;

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

  // ---------------- SUBMISSIONS (ADMIN) ----------------

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

  /**
   * Logged-in student ke batch IDs aur un batches ke course IDs.
   * 1) students row user_id se, na mile to email se
   * 2) batch_id / course_batch_id / batchId column se ID
   * 3) ID na ho to batch_code / batch_name text se course_batches mein dhoondta hai
   */
  private async getMyBatchContext(): Promise<{ batchIds: number[]; courseIds: number[] }> {
    const { data: auth, error: authError } = await this.supabase.auth.getUser();

    if (authError) throw new Error(authError.message);
    if (!auth.user) return { batchIds: [], courseIds: [] };

    let rows: Record<string, unknown>[] = [];

    const byUser = await this.supabase
      .from('students')
      .select('*')
      .eq('user_id', auth.user.id);

    if (!byUser.error && byUser.data?.length) {
      rows = byUser.data;
    } else if (auth.user.email) {
      const byEmail = await this.supabase
        .from('students')
        .select('*')
        .ilike('email', auth.user.email);

      if (!byEmail.error && byEmail.data?.length) {
        rows = byEmail.data;
      }
    }

    if (rows.length === 0) {
      console.warn('[Assignments] students table mein is login ki row nahi mili.', {
        userId: auth.user.id,
        email: auth.user.email,
      });
      return { batchIds: [], courseIds: [] };
    }

    const batchIds = new Set<number>();
    const batchTexts = new Set<string>();

    for (const row of rows) {
      const raw = row['batch_id'] ?? row['course_batch_id'] ?? row['batchId'];
      const id = Number(raw);

      if (raw !== null && raw !== undefined && raw !== '' && Number.isInteger(id) && id > 0) {
        batchIds.add(id);
        continue;
      }

      const text = row['batch_code'] ?? row['batch_name'] ?? row['batch'];
      if (typeof text === 'string' && text.trim()) {
        batchTexts.add(text.trim());
      }
    }

    // Text se batch dhoondna (agar students table mein ID nahi, code/name hai)
    for (const text of batchTexts) {
      const byCode = await this.supabase
        .from('course_batches')
        .select('id')
        .eq('batch_code', text);

      const byName = await this.supabase
        .from('course_batches')
        .select('id')
        .eq('batch_name', text);

      for (const b of [...(byCode.data ?? []), ...(byName.data ?? [])]) {
        const id = Number(b.id);
        if (Number.isInteger(id) && id > 0) batchIds.add(id);
      }
    }

    if (batchIds.size === 0) {
      console.warn(
        '[Assignments] Student ki row mili lekin batch nahi mili. Row ke columns:',
        Object.keys(rows[0]),
        rows[0],
      );
      return { batchIds: [], courseIds: [] };
    }

    const { data: batches, error: batchError } = await this.supabase
      .from('course_batches')
      .select('id, course_id')
      .in('id', [...batchIds]);

    if (batchError) throw new Error(batchError.message);

    const courseIds = new Set<number>();
    for (const b of batches ?? []) {
      const cid = Number(b.course_id);
      if (Number.isInteger(cid) && cid > 0) courseIds.add(cid);
    }

    return { batchIds: [...batchIds], courseIds: [...courseIds] };
  }

  /**
   * Student ko apne batch ki saari assignments (open + closed) milti hain:
   *  - jo uske batch ko di gayi hon, ya
   *  - jin ka batch "All batches" (null) ho aur course uske course se match kare.
   * Closed/expired wali page par disabled button ke saath dikhti hain.
   */
  async getAssignmentsForStudent(): Promise<AssignmentRecord[]> {
    // Student ke paas update ki ijazat na ho to bhi list load honi chahiye.
    try {
      await this.closeExpiredAssignments();
    } catch {
      /* ignore */
    }

    const { batchIds, courseIds } = await this.getMyBatchContext();
    if (batchIds.length === 0) return [];

    const filters = [`batch_id.in.(${batchIds.join(',')})`];
    if (courseIds.length > 0) {
      filters.push(`and(batch_id.is.null,course_id.in.(${courseIds.join(',')}))`);
    }

    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .or(filters.join(','))
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    if (!data?.length) {
      console.warn('[Assignments] Batch mili lekin is batch ki koi assignment nahi.', {
        batchIds,
        courseIds,
      });
    }

    return (data ?? []) as AssignmentRecord[];
  }

  // ---------------- STUDENT SUBMISSION ----------------

  /** Logged-in student ki basic info (id, email, naam). */
  private async getMyStudentInfo(): Promise<{
    userId: string;
    email: string | null;
    name: string | null;
  }> {
    const { data: auth, error } = await this.supabase.auth.getUser();
    if (error) throw new Error(error.message);
    if (!auth.user) throw new Error('Please log in again.');

    let row: Record<string, unknown> | null = null;

    const byUser = await this.supabase
      .from('students')
      .select('*')
      .eq('user_id', auth.user.id)
      .limit(1);

    if (!byUser.error && byUser.data?.length) {
      row = byUser.data[0];
    } else if (auth.user.email) {
      const byEmail = await this.supabase
        .from('students')
        .select('*')
        .ilike('email', auth.user.email)
        .limit(1);
      if (!byEmail.error && byEmail.data?.length) row = byEmail.data[0];
    }

    const rawName = row?.['full_name'] ?? row?.['name'] ?? row?.['student_name'];

    return {
      userId: auth.user.id,
      email: auth.user.email ?? null,
      name: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null,
    };
  }

  /** Is student ki apni saari submissions. */
  async getMySubmissions(): Promise<AssignmentSubmission[]> {
    const { data: auth, error: authError } = await this.supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!auth.user) return [];

    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .select('*')
      .eq('student_id', auth.user.id);

    if (error) throw new Error(error.message);

    return (data ?? []) as AssignmentSubmission[];
  }

  /**
   * Assignment submit karta hai.
   * Pehle submit ho chuka ho (aur check na hua ho) to update kar deta hai.
   */
  async submitAssignment(
    assignmentId: number,
    content: string,
    file: File | null,
  ): Promise<AssignmentSubmission> {
    const text = content.trim();

    if (!text && !file) {
      throw new Error('Please write your answer or attach a file.');
    }

    if (file) {
      if (!this.submissionTypes.includes(file.type)) {
        throw new Error('Only PDF, Word (doc/docx) and JPG/PNG/WebP files are allowed.');
      }
      if (file.size === 0 || file.size > this.maxSubmissionSize) {
        throw new Error('File must be greater than 0 bytes and 10 MB or less.');
      }
    }

    // Taaza status check (page purana ho sakta hai)
    const assignment = await this.getAssignment(assignmentId);
    if (assignment.status === 'closed' || this.isExpired(assignment.deadline)) {
      throw new Error('This assignment is closed. Submissions are no longer accepted.');
    }

    const me = await this.getMyStudentInfo();

    const existingResult = await this.supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', me.userId)
      .maybeSingle();

    if (existingResult.error) throw new Error(existingResult.error.message);

    const existing = existingResult.data as AssignmentSubmission | null;

    if (existing?.status === 'checked') {
      throw new Error('This submission has already been checked and cannot be changed.');
    }

    // File upload
    let fileUrl: string | null = existing?.file_url ?? null;

    if (file) {
      const dot = file.name.lastIndexOf('.');
      const ext =
        dot >= 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
      const path = `submissions/${assignmentId}/${me.userId}-${crypto.randomUUID()}.${ext || 'bin'}`;

      const { data: uploaded, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        const msg = uploadError.message.toLowerCase();
        if (msg.includes('row-level security') || msg.includes('policy')) {
          throw new Error(
            'File upload blocked by storage policy. Add an INSERT policy for the "assignments" bucket.',
          );
        }
        throw new Error(uploadError.message);
      }

      const { data: publicData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uploaded.path);

      fileUrl = publicData.publicUrl || null;
    }

    const payload = {
      content: text || null,
      file_url: fileUrl,
      submitted_at: new Date().toISOString(),
      status: 'submitted' as SubmissionStatus,
    };

    if (existing) {
      const { data, error } = await this.supabase
        .from('assignment_submissions')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data as AssignmentSubmission;
    }

    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: me.userId,
        student_name: me.name,
        student_email: me.email,
        ...payload,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as AssignmentSubmission;
  }
}