import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export type Row = Record<string, unknown>;

/*
  Apne database ke table names yahan set karein.
  Agar kisi page par "Could not load" aaye to is list mein table ka naam check karein.
*/
export const STUDENT_TABLES = {
  students: 'students',
  courses: 'courses',
  batches: 'course_batches',
  announcements: 'announcements',
  lectures: 'lectures',
  liveClasses: 'live_classes',
  quizzes: 'quizzes',
  assignments: 'assignments',
  results: 'results',
} as const;

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  raw: Row;
}

/** Row se pehli non-empty value uthata hai (alag column names ke liye). */
export function pick(row: Row | null | undefined, keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

export function fmtDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DATE_KEYS = ['created_at', 'published_at', 'date', 'due_date', 'start_time', 'scheduled_at'];

@Injectable({ providedIn: 'root' })
export class StudentDataService {
  private readonly supabase = inject(SupabaseService);

  readonly profile = signal<StudentProfile | null>(null);
  private loading: Promise<StudentProfile | null> | null = null;

  async load(force = false): Promise<StudentProfile | null> {
    if (force) {
      this.loading = null;
    }
    if (!this.loading) {
      this.loading = this.fetchProfile();
    }
    const result = await this.loading;
    this.profile.set(result);
    return result;
  }

  reset(): void {
    this.loading = null;
    this.profile.set(null);
  }

  private async fetchProfile(): Promise<StudentProfile | null> {
    const client = this.supabase.client;
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return null;

    let row: Row | null = null;

    const byUser = await client
      .from(STUDENT_TABLES.students)
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    if (!byUser.error && byUser.data && byUser.data.length > 0) {
      row = byUser.data[0] as Row;
    }

    if (!row && user.email) {
      const byEmail = await client
        .from(STUDENT_TABLES.students)
        .select('*')
        .eq('email', user.email.toLowerCase())
        .limit(1);
      if (!byEmail.error && byEmail.data && byEmail.data.length > 0) {
        row = byEmail.data[0] as Row;
      }
    }

    const courseId = pick(row, ['course_id', 'courseId']);
    const batchId = pick(row, ['batch_id', 'course_batch_id', 'batchId']);

    let courseName = '';
    let batchName = '';

    if (courseId) {
      const { data } = await client.from(STUDENT_TABLES.courses).select('*');
      const match = ((data ?? []) as Row[]).find(c => pick(c, ['course_id', 'id']) === courseId);
      courseName = pick(match, ['course_name', 'course_title', 'title', 'name']);
    }

    if (batchId) {
      const { data } = await client.from(STUDENT_TABLES.batches).select('*');
      const match = ((data ?? []) as Row[]).find(
        b => pick(b, ['course_batch_id', 'batch_id', 'id']) === batchId,
      );
      batchName = pick(match, ['batch_name', 'course_batch_name', 'batch_title', 'title', 'name']);
    }

    const metaName = String((user.user_metadata as Row | undefined)?.['full_name'] ?? '').trim();

    return {
      id: pick(row, ['student_id', 'id']),
      userId: user.id,
      fullName: pick(row, ['full_name', 'name', 'student_name']) || metaName || user.email || 'Student',
      email: pick(row, ['email']) || user.email || '',
      courseId,
      batchId,
      courseName,
      batchName,
      raw: row ?? {},
    };
  }

  /**
   * Table ki rows laata hai.
   * - own = true: sirf is student ki apni rows (results, attempts)
   * - warna: sirf student ke course/batch ki rows (announcements, quizzes ...)
   */
  async list(table: string, opts: { own?: boolean } = {}): Promise<Row[]> {
    const student = this.profile() ?? (await this.load());
    if (!student) return [];

    const { data, error } = await this.supabase.client.from(table).select('*');
    if (error) {
      console.error(`Error loading ${table}:`, error);
      throw new Error(error.message);
    }

    const rows = ((data ?? []) as Row[]).filter(row => {
      if (opts.own) {
        // For student's own records (results, submissions)
        const sid = pick(row, ['student_id', 'studentId']);
        const uid = pick(row, ['user_id', 'userId']);
        if (sid && sid !== student.id && sid !== student.userId) return false;
        if (uid && uid !== student.userId && uid !== student.id) return false;
        return true;
      }

      // For course/batch content (lectures, quizzes, assignments, etc.)
      const rowBatch = pick(row, ['batch_id', 'course_batch_id', 'batchId']);
      const rowCourse = pick(row, ['course_id', 'courseId']);

      // If row has batch, match with student's batch
      if (rowBatch && student.batchId) {
        if (rowBatch === student.batchId) return true;
      }

      // If row has course, match with student's course
      if (rowCourse && student.courseId) {
        if (rowCourse === student.courseId) return true;
      }

      // If no batch/course specified, include it (global announcements, etc.)
      if (!rowBatch && !rowCourse) return true;

      return false;
    });

    return rows.sort((a, b) => pick(b, DATE_KEYS).localeCompare(pick(a, DATE_KEYS)));
  }
}