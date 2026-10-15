import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuizRecord, QuizService } from '../../core/services/quiz.service';
import {
  AttemptWithQuiz,
  QuizAttemptService,
  isPastDeadline,
  percent,
} from '../../core/services/quiz-attempt.service';
import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

type CardAction = 'start' | 'resume' | 'result' | 'closed';

@Component({
  selector: 'app-student-quizzes',
  standalone: true,
  template: `
    <div class="page-head">
      <div class="heading-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="2"/>
          <path d="M9 8h6M9 12h6M9 16h3"/>
        </svg>
      </div>

      <div class="heading-content">
        <span class="kicker">STUDENT PORTAL / ASSESSMENTS</span>
        <h1>Available Assessments</h1>
        <p>View your quizzes, continue unfinished attempts, and check your results.</p>
      </div>

      <div class="total-box">
        <span class="total-number">{{ quizzes().length }}</span>
        <span class="total-label">
          {{ quizzes().length === 1 ? 'Quiz available' : 'Quizzes available' }}
        </span>
      </div>
    </div>

    @if (loading()) {
      <div class="state">
        <span class="spinner"></span>
        <span>Loading your assessments...</span>
      </div>
    } @else if (quizzes().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.7">
            <rect x="5" y="3" width="14" height="18" rx="2"/>
            <path d="M9 8h6M9 12h6M9 16h3"/>
          </svg>
        </div>
        <h2>No quizzes available</h2>
        <p>No quizzes have been published for your batch yet.</p>
      </div>
    } @else {
      <section class="assessment-section">
        <div class="section-heading">
          <div>
            <h2>Your Assessments</h2>
            <p>Complete your assessments and track your academic progress.</p>
          </div>
          <span class="read-only-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
            {{ quizzes().length }} {{ quizzes().length === 1 ? 'quiz' : 'quizzes' }}
          </span>
        </div>

        <div class="cards">
          @for (q of quizzes(); track q.id) {
            <article class="quiz-card">
              <div class="card-banner">
                <div class="banner-top">
                  <span class="assessment-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1.8">
                      <path d="m9 11 3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    ASSESSMENT
                  </span>

                  <span
                    class="status-badge"
                    [class.done]="action(q) === 'result'"
                    [class.progress]="action(q) === 'resume'"
                    [class.closed]="action(q) === 'closed'"
                  >
                    <span class="status-dot"></span>
                    {{ badge(q) }}
                  </span>
                </div>

                <div class="banner-course">
                  <div class="course-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1.8">
                      <rect x="5" y="3" width="14" height="18" rx="2"/>
                      <path d="M9 8h6M9 12h6M9 16h3"/>
                    </svg>
                  </div>
                  <div>
                    <span class="course-eyebrow">KNOWLEDGE CHECK</span>
                    <h3>{{ q.title }}</h3>
                    <p>Standard evaluation module</p>
                  </div>
                </div>
              </div>

              <div class="card-content">
                @if (q.description) {
                  <p class="quiz-desc">{{ q.description }}</p>
                } @else {
                  <p class="quiz-desc">Test your knowledge and review your learning progress.</p>
                }

                <div class="quiz-meta">
                  <div class="meta-item">
                    <span class="meta-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 7v5l3 2"/>
                      </svg>
                    </span>
                    <div>
                      <span class="meta-label">Time Limit</span>
                      <strong>{{ q.duration_minutes }} minutes</strong>
                    </div>
                  </div>

                  <div class="meta-item">
                    <span class="meta-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6M8 13h8M8 17h5"/>
                      </svg>
                    </span>
                    <div>
                      <span class="meta-label">Total Marks</span>
                      <strong>{{ q.total_marks }} marks</strong>
                    </div>
                  </div>

                  @if (q.deadline) {
                    <div class="meta-item deadline-item">
                      <span class="meta-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8">
                          <rect x="3" y="4" width="18" height="17" rx="2"/>
                          <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                      </span>
                      <div>
                        <span class="meta-label">Deadline</span>
                        <strong>{{ formatDate(q.deadline) }}</strong>
                      </div>
                    </div>
                  }
                </div>

                @if (attemptFor(q); as a) {
                  @if (a.status !== 'in_progress') {
                    <div class="result-panel">
                      <div class="result-left">
                        <span class="result-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="m5 12 4 4L19 6"/>
                          </svg>
                        </span>
                        <div>
                          <span class="result-label">YOUR RESULT</span>
                          <strong>
                            {{ a.score ?? 0 }} / {{ a.total_marks ?? q.total_marks }} marks
                          </strong>
                        </div>
                      </div>
                      <div class="result-percentage">
                        <strong>{{ pct(a) }}%</strong>
                        <span>Score</span>
                      </div>
                    </div>
                  }
                }

                <div class="card-footer">
                  <div class="passing-info">
                    <span class="passing-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="m8 12 2.5 2.5L16 9"/>
                      </svg>
                    </span>
                    <div>
                      <span class="meta-label">Passing Marks</span>
                      <strong>{{ q.passing_marks }} / {{ q.total_marks }}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="start-btn"
                    [class.result-btn]="action(q) === 'result'"
                    [class.resume-btn]="action(q) === 'resume'"
                    [disabled]="action(q) === 'closed'"
                    (click)="open(q)"
                  >
                    {{ buttonLabel(q) }}

                    @if (action(q) === 'result') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    } @else if (action(q) !== 'closed') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2">
                        <path d="M5 12h14M13 6l6 6-6 6"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [PAGE_STYLES, `
    :host {
      display: block;
      color: #0f172a;
      font-family: inherit;
    }

    /* Page Header matching profile standard */
    .page-head {
      position: relative;
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 28px !important;
      margin: 0 0 24px;
      border: 1px solid #1e293b !important;
      border-radius: 20px;
      background:
        radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.25), transparent 45%),
        linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%) !important;
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12) !important;
    }

    .heading-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 56px;
      width: 56px;
      height: 56px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      color: #93c5fd;
    }

    .heading-icon svg {
      width: 26px;
      height: 26px;
    }

    .heading-content {
      min-width: 0;
      flex: 1;
    }

    .page-head .kicker {
      display: inline-block;
      margin-bottom: 6px;
      color: #93c5fd !important;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .14em;
    }

    .page-head h1 {
      margin: 0;
      color: #fff !important;
      font-size: clamp(24px, 2.8vw, 32px);
      font-weight: 700;
      letter-spacing: -.03em;
      line-height: 1.2;
    }

    .page-head p {
      margin: 6px 0 0;
      color: #cbd5e1 !important;
      font-size: 13.5px;
      line-height: 1.6;
    }

    .total-box {
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 12px 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
    }

    .total-number {
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      line-height: 1.2;
    }

    .total-label {
      margin-top: 2px;
      color: #94a3b8;
      font-size: 11px;
      white-space: nowrap;
    }

    /* Assessment Section */
    .assessment-section {
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent !important;
      box-shadow: none;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .section-heading h2 {
      margin: 0;
      color: #0f172a;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -.02em;
    }

    .section-heading p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .read-only-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }

    /* Quiz Cards matching profile info-card standard */
    .quiz-card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff !important;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
      transition: all 0.2s ease;
    }

    .quiz-card:hover {
      transform: translateY(-3px);
      border-color: #cbd5e1;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
    }

    .card-banner {
      position: relative;
      overflow: hidden;
      padding: 20px 20px 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%) !important;
      color: #fff;
    }

    .card-banner::after {
      position: absolute;
      top: -50px;
      right: -30px;
      width: 140px;
      height: 140px;
      border: 1px solid rgba(147, 197, 253, 0.08);
      border-radius: 50%;
      content: '';
      pointer-events: none;
    }

    .banner-top,
    .banner-course,
    .banner-bottom {
      position: relative;
      z-index: 1;
    }

    .banner-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .assessment-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #93c5fd;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
    }

    .assessment-label svg {
      width: 14px;
      height: 14px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 8px;
      background: rgba(22, 163, 74, 0.15) !important;
      color: #4ade80 !important;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-badge.done {
      border-color: rgba(74, 222, 128, 0.3);
      background: rgba(22, 163, 74, 0.15) !important;
      color: #4ade80 !important;
    }

    .status-badge.progress {
      border-color: rgba(251, 191, 36, 0.3);
      background: rgba(217, 119, 6, 0.15) !important;
      color: #f6ad55 !important;
    }

    .status-badge.closed {
      border-color: rgba(148, 163, 184, 0.2);
      background: rgba(148, 163, 184, 0.1) !important;
      color: #cbd5e1 !important;
    }

    .banner-course {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 0 16px;
    }

    .course-icon {
      display: flex;
      flex: 0 0 42px;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      color: #93c5fd;
    }

    .course-icon svg {
      width: 20px;
      height: 20px;
    }

    .course-eyebrow {
      display: block;
      margin-bottom: 2px;
      color: #93c5fd;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
    }

    .banner-course h3 {
      margin: 0;
      color: #fff !important;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .banner-course p {
      margin: 2px 0 0;
      color: #94a3b8;
      font-size: 11px;
    }

    .banner-bottom {
      padding: 10px 0 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .08em;
    }

    .card-content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      background: #ffffff !important;
    }

    .quiz-desc {
      margin: 0;
      color: #64748b !important;
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .quiz-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 14px 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
    }

    .meta-item {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 10px;
    }

    .meta-icon {
      display: flex;
      flex: 0 0 36px;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f8fafc;
      color: #2563eb;
    }

    .meta-icon svg {
      width: 18px;
      height: 18px;
    }

    .meta-item > div,
    .passing-info > div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    .meta-label {
      color: #64748b !important;
      font-size: 11px;
      font-weight: 500;
    }

    .meta-item strong,
    .passing-info strong {
      color: #0f172a !important;
      font-size: 12.5px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .deadline-item {
      grid-column: 1 / -1;
    }

    .result-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      background: #f0fdf4 !important;
    }

    .result-left {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 10px;
    }

    .result-icon {
      display: flex;
      flex: 0 0 34px;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #dcfce7;
      color: #15803d;
    }

    .result-icon svg {
      width: 18px;
      height: 18px;
    }

    .result-left > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .result-label {
      color: #15803d;
      font-size: 10px;
      font-weight: 600;
    }

    .result-left strong {
      color: #14532d;
      font-size: 12.5px;
      font-weight: 700;
    }

    .result-percentage {
      display: flex;
      flex-shrink: 0;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .result-percentage strong {
      color: #15803d;
      font-size: 18px;
      font-weight: 800;
    }

    .result-percentage span {
      color: #166534;
      font-size: 10px;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: auto;
      padding-top: 4px;
    }

    .passing-info {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 10px;
    }

    .passing-icon {
      display: flex;
      flex: 0 0 34px;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #f8fafc;
      color: #059669;
    }

    .passing-icon svg {
      width: 18px;
      height: 18px;
    }

    .start-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px solid #2563eb;
      border-radius: 10px;
      background: #2563eb !important;
      color: #ffffff !important;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .start-btn svg {
      width: 15px;
      height: 15px;
    }

    .start-btn:hover:not(:disabled) {
      background: #1d4ed8 !important;
    }

    .start-btn.result-btn {
      border-color: #bbf7d0;
      background: #f0fdf4 !important;
      color: #15803d !important;
    }

    .start-btn.result-btn:hover:not(:disabled) {
      background: #dcfce7 !important;
    }

    .start-btn.resume-btn {
      border-color: #fde68a;
      background: #fffbeb !important;
      color: #b45309 !important;
    }

    .start-btn:disabled {
      border-color: #e2e8f0;
      background: #f8fafc !important;
      color: #94a3b8 !important;
      cursor: not-allowed;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 50px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff !important;
      text-align: center;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
    }

    .empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      margin-bottom: 14px;
      border-radius: 16px;
      background: #eff6ff;
      color: #2563eb;
    }

    .empty-icon svg {
      width: 26px;
      height: 26px;
    }

    .empty-state h2 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 700;
    }

    .empty-state p {
      margin: 0;
      color: #64748b;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 200px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff !important;
      color: #64748b !important;
      font-size: 13px;
    }

    .spinner {
      display: block;
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: quiz-spin 0.75s linear infinite;
    }

    @keyframes quiz-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 768px) {
      .page-head {
        flex-direction: column;
        align-items: stretch;
        gap: 18px;
        padding: 20px !important;
      }
      .cards {
        grid-template-columns: 1fr;
      }
      .card-footer {
        align-items: stretch;
        flex-direction: column;
      }
      .start-btn {
        width: 100%;
      }
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
        this.attemptService.getMyAttempts().catch(
          () => [] as AttemptWithQuiz[],
        ),
      ]);

      this.quizzes.set(quizzes);
      this.attempts.set(attempts);
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message ||
          'Please try again in a moment.',
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
        attempt.status === 'in_progress' &&
        new Date(attempt.ends_at).getTime() > Date.now();

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
        if (attempt) {
          void this.router.navigate([
            '/student/quizzes/result',
            attempt.id,
          ]);
        }
        break;

      case 'closed':
        break;

      default:
        void this.router.navigate([
          '/student/quizzes',
          q.id,
          'take',
        ]);
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