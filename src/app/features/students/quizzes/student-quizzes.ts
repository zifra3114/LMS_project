import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuizRecord, QuizService } from '../../../core/services/quiz.service';
import {
  AttemptWithQuiz,
  QuizAttemptService,
  isPastDeadline,
  percent,
} from '../../../core/services/quiz-attempt.service';
import { Toast } from '../../../core/services/toast.service';
import { PAGE_STYLES } from "../student-portal/student-portal.styles";

type CardAction = 'start' | 'resume' | 'result' | 'closed';

@Component({
  selector: 'app-student-quizzes',
  standalone: true,
  template: `
    <div class="page-head">
      <span class="kicker">Assessments</span>
      <h1>Quizzes</h1>
      <p>Quizzes assigned to your batch appear here. Each quiz has a time limit that starts when you press Start.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading quizzes...</div>
    } @else if (quizzes().length === 0) {
      <div class="state">
        <strong>No quizzes available</strong>
        No quizzes have been published for your batch yet.
      </div>
    } @else {
      <div class="cards">
        @for (q of quizzes(); track q.id) {
          <div class="quiz-card">
            <div class="quiz-header">
              <h3>{{ q.title }}</h3>
              <span class="status-badge" [class.done]="action(q) === 'result'">{{ badge(q) }}</span>
            </div>

            @if (q.description) {
              <p class="quiz-desc">{{ q.description }}</p>
            }

            <div class="quiz-meta">
              <div class="meta-item">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span>{{ q.duration_minutes }} minutes</span>
              </div>
              <div class="meta-item">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
                </svg>
                <span>{{ q.total_marks }} marks</span>
              </div>
              @if (q.deadline) {
                <div class="meta-item">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <span>Due: {{ formatDate(q.deadline) }}</span>
                </div>
              }
            </div>

            @if (attemptFor(q); as a) {
              @if (a.status !== 'in_progress') {
                <p class="score-line">
                  Your score: <strong>{{ a.score ?? 0 }}/{{ a.total_marks ?? q.total_marks }}</strong>
                  ({{ pct(a) }}%)
                </p>
              }
            }

            <div class="quiz-footer">
              <span class="passing-marks">Passing: {{ q.passing_marks }}/{{ q.total_marks }}</span>
              <button
                type="button"
                class="start-btn"
                [disabled]="action(q) === 'closed'"
                (click)="open(q)"
              >
                {{ buttonLabel(q) }}
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [PAGE_STYLES, `
    .quiz-card {
      display: flex; flex-direction: column; gap: 14px;
      border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; padding: 20px;
      box-shadow: 0 2px 4px rgb(15 23 42 / 4%);
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    .quiz-card:hover { border-color: #93c5fd; box-shadow: 0 10px 24px rgb(15 23 42 / 8%); transform: translateY(-1px); }
    .quiz-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .quiz-header h3 { margin: 0; font-size: 15px; font-weight: 900; color: #020617; line-height: 1.4; }
    .status-badge {
      flex: 0 0 auto; padding: 6px 12px; border-radius: 999px; font-size: 10px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.05em; background: #dbeafe; color: #1d4ed8;
    }
    .status-badge.done { background: #dcfce7; color: #15803d; }
    .quiz-desc {
      margin: 0; color: #64748b; font-size: 12.5px; line-height: 1.6;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .quiz-meta { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
    .meta-item { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 11.5px; font-weight: 600; }
    .icon { width: 15px; height: 15px; color: #94a3b8; }
    .score-line { margin: 0; font-size: 12.5px; color: #334155; }
    .quiz-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding-top: 8px; border-top: 1px solid #f1f5f9;
    }
    .passing-marks { color: #64748b; font-size: 11px; font-weight: 700; }
    .start-btn {
      padding: 10px 18px; border: 0; border-radius: 11px; background: #1d4ed8; color: #fff;
      font-size: 12px; font-weight: 800; font-family: inherit; cursor: pointer; transition: background .2s ease;
    }
    .start-btn:hover:not(:disabled) { background: #1e40af; }
    .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 639px) {
      .quiz-footer { flex-direction: column; align-items: stretch; }
      .start-btn { width: 100%; }
    }
  `],
})
export class StudentQuizzes implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly attemptService = inject(QuizAttemptService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  readonly quizzes = signal<QuizRecord[]>([]);
  readonly attempts = signal<AttemptWithQuiz[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [quizzes, attempts] = await Promise.all([
        this.quizService.getQuizzesForStudent(),
        this.attemptService.getMyAttempts().catch(() => [] as AttemptWithQuiz[]),
      ]);
      this.quizzes.set(quizzes);
      this.attempts.set(attempts);
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Please try again in a moment.',
        'Unable to load quizzes',
      );
    } finally {
      this.loading.set(false);
    }
  }

  attemptFor(q: QuizRecord): AttemptWithQuiz | undefined {
    return this.attempts().find((a) => a.quiz_id === q.id);
  }

  action(q: QuizRecord): CardAction {
    const attempt = this.attemptFor(q);

    if (attempt) {
      const running =
        attempt.status === 'in_progress' && new Date(attempt.ends_at).getTime() > Date.now();
      return running ? 'resume' : 'result';
    }

    return isPastDeadline(q.deadline) ? 'closed' : 'start';
  }

  badge(q: QuizRecord): string {
    switch (this.action(q)) {
      case 'result':
        return 'Completed';
      case 'resume':
        return 'In progress';
      case 'closed':
        return 'Closed';
      default:
        return 'Open';
    }
  }

  buttonLabel(q: QuizRecord): string {
    switch (this.action(q)) {
      case 'result':
        return 'View Result';
      case 'resume':
        return 'Resume Quiz';
      case 'closed':
        return 'Deadline Passed';
      default:
        return 'Start Quiz';
    }
  }

  open(q: QuizRecord): void {
    const attempt = this.attemptFor(q);

    switch (this.action(q)) {
      case 'result':
        if (attempt) void this.router.navigate(['/student/quizzes/result', attempt.id]);
        break;
      case 'closed':
        break;
      default:
        void this.router.navigate(['/student/quizzes', q.id, 'take']);
    }
  }

  pct(a: AttemptWithQuiz): number {
    return percent(a.score, a.total_marks);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}