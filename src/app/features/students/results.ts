import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Toast } from '../../core/services/toast.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';
import { StudentDataService, fmtDate } from './student-portal/student-data.service';

type ResultKind = 'quiz' | 'assignment';
type Filter = 'all' | ResultKind;

interface ResultItem {
  key: string;
  kind: ResultKind;
  title: string;
  score: number | null;
  total: number | null;
  percentage: number | null;
  /** true = pass, false = fail, null = pass/fail lagu nahi (assignment ya unknown) */
  passed: boolean | null;
  pending: boolean;
  feedback: string;
  dateRaw: string;
  date: string;
  attemptId: number | null;
}

interface QuizAttemptRow {
  id: number;
  quiz_id: number;
  score: number | null;
  total_marks: number | null;
  passed: boolean | null;
  status: string | null;
  submitted_at: string | null;
}

interface QuizRow {
  id: number;
  title: string | null;
  total_marks: number | null;
  passing_marks: number | null;
}

interface SubmissionRow {
  id: number;
  assignment_id: number;
  submitted_at: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  graded_at: string | null;
}

interface AssignmentRow {
  id: number;
  title: string | null;
  total_marks: number | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toPercent(score: number | null, total: number | null): number | null {
  if (score === null || total === null || total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((score / total) * 100)));
}

@Component({
  selector: 'app-student-results',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <span class="kicker">Academic Performance</span>
      <div class="head-row">
        <h1>My Results</h1>
        @if (!loading() && results().length > 0) {
          <span class="count">
            {{ results().length }} {{ results().length === 1 ? 'result' : 'results' }}
          </span>
        }
      </div>
      <p>Your quiz and assignment results appear here.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading results...</div>
    } @else if (results().length === 0) {
      <div class="state">
        <strong>No results yet</strong>
        Your quiz results and graded assignments will appear here.
      </div>
    } @else {
      <div class="summary">
        <div class="sum-box">
          <strong>{{ quizPassed() }}</strong>
          <span>Quizzes passed</span>
        </div>
        <div class="sum-box fail">
          <strong>{{ quizFailed() }}</strong>
          <span>Quizzes failed</span>
        </div>
        <div class="sum-box blue">
          <strong>{{ assignmentsGraded() }}</strong>
          <span>Assignments graded</span>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" [class.active]="filter() === 'all'"
          (click)="filter.set('all')">All</button>
        <button type="button" role="tab" class="tab" [class.active]="filter() === 'quiz'"
          (click)="filter.set('quiz')">Quizzes</button>
        <button type="button" role="tab" class="tab" [class.active]="filter() === 'assignment'"
          (click)="filter.set('assignment')">Assignments</button>
      </div>

      @if (visible().length === 0) {
        <div class="state">
          <strong>Nothing in this tab</strong>
          No {{ filter() === 'quiz' ? 'quiz' : 'assignment' }} results yet.
        </div>
      } @else {
        <div class="cards">
          @for (r of visible(); track r.key) {
            <div class="result-card"
              [class.passed]="r.passed === true"
              [class.failed]="r.passed === false"
              [class.pending]="r.pending">

              <div class="result-header">
                <div class="result-titles">
                  <span class="kind-tag" [class.assignment]="r.kind === 'assignment'">
                    {{ r.kind === 'quiz' ? 'Quiz' : 'Assignment' }}
                  </span>
                  <h3>{{ r.title }}</h3>
                </div>

                <div class="score-circle"
                  [class.passed]="r.passed === true"
                  [class.failed]="r.passed === false">
                  @if (r.pending) {
                    <span class="score dash">—</span>
                  } @else {
                    <span class="score">{{ r.score }}</span>
                    <span class="total">/{{ r.total ?? '?' }}</span>
                  }
                </div>
              </div>

              @if (r.percentage !== null && !r.pending) {
                <div class="bar-wrap">
                  <div class="bar-label">
                    <span>Percentage</span>
                    <b>{{ r.percentage }}%</b>
                  </div>
                  <div class="bar">
                    <span class="fill"
                      [class.passed]="r.passed === true"
                      [class.failed]="r.passed === false"
                      [style.width.%]="r.percentage"></span>
                  </div>
                </div>
              }

              @if (r.pending) {
                <div class="result-status pending">
                  <span>Awaiting grading</span>
                </div>
              } @else if (r.passed !== null) {
                <div class="result-status"
                  [class.passed]="r.passed"
                  [class.failed]="!r.passed">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    @if (r.passed) {
                      <path d="m5 12 4 4L19 6" />
                    } @else {
                      <path d="m6 6 12 12M18 6 6 18" />
                    }
                  </svg>
                  <span>{{ r.passed ? 'Passed' : 'Failed' }}</span>
                </div>
              }

              @if (r.feedback) {
                <div class="feedback-box">
                  <strong>Feedback</strong>
                  <p>{{ r.feedback }}</p>
                </div>
              }

              <div class="result-foot">
                @if (r.date) {
                  <span class="foot-date">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {{ r.pending ? 'Submitted' : 'Date' }}: {{ r.date }}
                  </span>
                }
                @if (r.kind === 'quiz' && r.attemptId) {
                  <a class="detail-link" [routerLink]="['/student/quizzes/result', r.attemptId]">
                    View details →
                  </a>
                }
              </div>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [
    PAGE_STYLES,
    `
      .head-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 12px 0 6px; }
      .page-head h1 { margin: 0; }
      .count { padding: 4px 11px; border-radius: 999px; background: #0f172a; color: #fff; font-size: 11px; font-weight: 700; }

      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
      .sum-box { display: flex; flex-direction: column; gap: 2px; padding: 16px 18px; border: 1px solid #bbf7d0; border-radius: 14px; background: #f0fdf4; }
      .sum-box strong { font-size: 24px; font-weight: 800; color: #15803d; line-height: 1.2; }
      .sum-box span { font-size: 11.5px; font-weight: 600; color: #64748b; }
      .sum-box.fail { border-color: #fecdd3; background: #fff1f2; }
      .sum-box.fail strong { color: #be123c; }
      .sum-box.blue { border-color: #bfdbfe; background: #eff6ff; }
      .sum-box.blue strong { color: #1d4ed8; }

      .tabs { display: inline-flex; gap: 4px; margin-bottom: 20px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
      .tab { padding: 8px 16px; border: 0; border-radius: 9px; background: transparent; color: #64748b; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: background .15s ease, color .15s ease; }
      .tab:hover { background: #f1f5f9; }
      .tab.active { background: #0f172a; color: #fff; }

      .result-card { display: flex; flex-direction: column; gap: 16px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; padding: 20px; box-shadow: 0 1px 3px rgb(15 23 42 / 5%); transition: box-shadow .18s ease, transform .18s ease; min-width: 0; }
      .result-card:hover { box-shadow: 0 12px 28px rgb(15 23 42 / 9%); transform: translateY(-2px); }
      .result-card.passed { border-color: #86efac; background: linear-gradient(to bottom, #f0fdf4 0%, #fff 55%); }
      .result-card.failed { border-color: #fca5a5; background: linear-gradient(to bottom, #fef2f2 0%, #fff 55%); }
      .result-card.pending { border-style: dashed; }

      .result-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
      .result-titles { min-width: 0; }
      .result-titles h3 { margin: 8px 0 0; font-size: 15.5px; font-weight: 700; color: #0f172a; line-height: 1.4; overflow-wrap: anywhere; }

      .kind-tag { display: inline-block; padding: 3px 9px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      .kind-tag.assignment { background: #f5f3ff; color: #6d28d9; }

      .score-circle { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; border: 3px solid #e2e8f0; background: #f8fafc; }
      .score-circle.passed { border-color: #22c55e; background: #f0fdf4; }
      .score-circle.failed { border-color: #ef4444; background: #fef2f2; }
      .score { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1; }
      .score.dash { color: #94a3b8; }
      .total { margin-top: 2px; font-size: 11px; font-weight: 700; color: #64748b; }

      .bar-wrap { display: flex; flex-direction: column; gap: 6px; }
      .bar-label { display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #64748b; }
      .bar-label b { color: #0f172a; }
      .bar { height: 7px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
      .fill { display: block; height: 100%; border-radius: 999px; background: #3b82f6; transition: width .6s ease; }
      .fill.passed { background: #22c55e; }
      .fill.failed { background: #ef4444; }

      .result-status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; }
      .result-status.passed { background: #dcfce7; color: #15803d; }
      .result-status.failed { background: #fee2e2; color: #991b1b; }
      .result-status.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

      .icon { width: 15px; height: 15px; flex-shrink: 0; }

      .feedback-box { padding: 14px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
      .feedback-box strong { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: .05em; }
      .feedback-box p { margin: 0; color: #475569; font-size: 12.5px; line-height: 1.6; white-space: pre-line; overflow-wrap: anywhere; }

      .result-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9; }
      .foot-date { display: inline-flex; align-items: center; gap: 6px; color: #64748b; font-size: 11.5px; font-weight: 600; }
      .foot-date .icon { color: #94a3b8; }
      .detail-link { color: #2563eb; font-size: 12px; font-weight: 700; text-decoration: none; }
      .detail-link:hover { text-decoration: underline; }

      @media (max-width: 639px) {
        .score-circle { width: 64px; height: 64px; }
      }
    `,
  ],
})
export class StudentResults implements OnInit {
  private readonly data = inject(StudentDataService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(Toast);

  readonly results = signal<ResultItem[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<Filter>('all');

  readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.results() : this.results().filter((r) => r.kind === f);
  });

  readonly quizPassed = computed(
    () => this.results().filter((r) => r.kind === 'quiz' && r.passed === true).length,
  );
  readonly quizFailed = computed(
    () => this.results().filter((r) => r.kind === 'quiz' && r.passed === false).length,
  );
  readonly assignmentsGraded = computed(
    () => this.results().filter((r) => r.kind === 'assignment' && !r.pending).length,
  );

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);

    try {
      const profile = await this.data.load();

      if (!profile) {
        this.results.set([]);
        return;
      }

      // student_id column uuid hai: auth user id (aur agar students.id bhi uuid ho to wo)
      const ids = Array.from(
        new Set([profile.userId, profile.id].filter((v): v is string => !!v && UUID.test(v))),
      );

      const [quizzes, assignments] = await Promise.allSettled([
        this.loadQuizzes(ids),
        this.loadAssignments(ids),
      ]);

      const items: ResultItem[] = [
        ...(quizzes.status === 'fulfilled' ? quizzes.value : []),
        ...(assignments.status === 'fulfilled' ? assignments.value : []),
      ];

      items.sort((a, b) => b.dateRaw.localeCompare(a.dateRaw));
      this.results.set(items);

      // Dono fail hon tabhi error dikhao
      if (quizzes.status === 'rejected' && assignments.status === 'rejected') {
        throw quizzes.reason;
      }

      if (quizzes.status === 'rejected') {
        console.error('[StudentResults] quizzes failed:', quizzes.reason);
        this.toast.warning('Quiz results could not be loaded.', 'Partial results');
      }

      if (assignments.status === 'rejected') {
        console.error('[StudentResults] assignments failed:', assignments.reason);
        this.toast.warning('Assignment results could not be loaded.', 'Partial results');
      }
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Unable to load results.',
        'Error',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Quizzes ----------

  private async loadQuizzes(studentIds: string[]): Promise<ResultItem[]> {
    if (studentIds.length === 0) return [];

    const client = this.supabase.client;

    const { data, error } = await client
      .from('quiz_attempts')
      .select('id, quiz_id, score, total_marks, passed, status, submitted_at')
      .in('student_id', studentIds);

    if (error) throw new Error(error.message);

    // Jo quiz abhi chal rahi hai (submit nahi hui) uska result nahi hota
    const attempts = ((data ?? []) as QuizAttemptRow[]).filter(
      (a) => a.status !== 'in_progress' || !!a.submitted_at,
    );

    if (attempts.length === 0) return [];

    const quizIds = Array.from(new Set(attempts.map((a) => a.quiz_id)));
    const { data: quizData } = await client
      .from('quizzes')
      .select('id, title, total_marks, passing_marks')
      .in('id', quizIds);

    const quizMap = new Map<number, QuizRow>(
      ((quizData ?? []) as QuizRow[]).map((q) => [q.id, q]),
    );

    return attempts.map((a): ResultItem => {
      const quiz = quizMap.get(a.quiz_id);
      const score = a.score ?? 0;
      const total = a.total_marks ?? quiz?.total_marks ?? null;

      let passed: boolean | null = a.passed;
      if (passed === null && quiz?.passing_marks !== null && quiz?.passing_marks !== undefined) {
        passed = score >= quiz.passing_marks;
      }

      const dateRaw = a.submitted_at ?? '';

      return {
        key: `quiz-${a.id}`,
        kind: 'quiz',
        title: quiz?.title?.trim() || 'Quiz',
        score,
        total,
        percentage: toPercent(score, total),
        passed,
        pending: false,
        feedback: '',
        dateRaw,
        date: fmtDate(dateRaw),
        attemptId: a.id,
      };
    });
  }

  // ---------- Assignments ----------

  private async loadAssignments(studentIds: string[]): Promise<ResultItem[]> {
    if (studentIds.length === 0) return [];

    const client = this.supabase.client;

    const { data, error } = await client
      .from('assignment_submissions')
      .select('id, assignment_id, submitted_at, marks_obtained, feedback, graded_at')
      .in('student_id', studentIds);

    if (error) throw new Error(error.message);

    const submissions = (data ?? []) as SubmissionRow[];
    if (submissions.length === 0) return [];

    const assignmentIds = Array.from(new Set(submissions.map((s) => s.assignment_id)));
    const { data: assignmentData } = await client
      .from('assignments')
      .select('id, title, total_marks')
      .in('id', assignmentIds);

    const assignmentMap = new Map<number, AssignmentRow>(
      ((assignmentData ?? []) as AssignmentRow[]).map((a) => [a.id, a]),
    );

    return submissions.map((s): ResultItem => {
      const assignment = assignmentMap.get(s.assignment_id);
      const graded = s.marks_obtained !== null && s.marks_obtained !== undefined;
      const total = assignment?.total_marks ?? null;
      const dateRaw = (graded ? s.graded_at : null) ?? s.submitted_at ?? '';

      return {
        key: `assignment-${s.id}`,
        kind: 'assignment',
        title: assignment?.title?.trim() || 'Assignment',
        score: graded ? Number(s.marks_obtained) : null,
        total,
        percentage: graded ? toPercent(Number(s.marks_obtained), total) : null,
        passed: null,
        pending: !graded,
        feedback: (s.feedback ?? '').trim(),
        dateRaw,
        date: fmtDate(dateRaw),
        attemptId: null,
      };
    });
  }
}