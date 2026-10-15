import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AttemptQuestion,
  PublishedQuiz,
  QuizAttempt,
  QuizAttemptService,
  isPastDeadline,
} from '../../../core/services/quiz-attempt.service';
import { Toast } from '../../../core/services/toast.service';

type Phase = 'loading' | 'intro' | 'running' | 'submitting' | 'error';

@Component({
  selector: 'app-take-quiz',
  standalone: true,
  template: `
    <div class="wrap">
      @switch (phase()) {
        @case ('loading') {
          <div class="panel center"><span class="spinner"></span> Loading quiz…</div>
        }

        @case ('error') {
          <div class="panel center">
            <h2>Unable to open this quiz</h2>
            <p class="muted">{{ error() }}</p>
            <button type="button" class="btn ghost" (click)="back()">Back to quizzes</button>
          </div>
        }

        @case ('intro') {
          @if (quiz(); as q) {
            <div class="panel">
              <span class="kicker">Quiz</span>
              <h1>{{ q.title }}</h1>
              @if (q.description) { <p class="muted">{{ q.description }}</p> }

              <div class="facts">
                <div><strong>{{ q.duration_minutes }}</strong><span>minutes</span></div>
                <div><strong>{{ questions().length }}</strong><span>questions</span></div>
                <div><strong>{{ q.total_marks }}</strong><span>total marks</span></div>
                <div><strong>{{ q.passing_marks }}</strong><span>to pass</span></div>
              </div>

              <ul class="rules">
                <li>The timer starts as soon as you press <b>{{ resuming() ? 'Resume' : 'Start' }}</b> and cannot be paused.</li>
                <li>Your quiz is submitted automatically when the time runs out.</li>
                <li>You can change answers and move between questions before you submit.</li>
              </ul>

              <div class="actions">
                <button type="button" class="btn ghost" (click)="back()">Cancel</button>
                <button type="button" class="btn primary" [disabled]="starting()" (click)="start()">
                  {{ starting() ? 'Starting…' : resuming() ? 'Resume Quiz' : 'Start Quiz' }}
                </button>
              </div>
            </div>
          }
        }

        @case ('running') {
          @if (current(); as question) {
            <div class="topbar">
              <div>
                <strong>{{ quiz()?.title }}</strong>
                <span class="muted"> · {{ answeredCount() }}/{{ questions().length }} answered</span>
              </div>
              <div class="timer" [class.warn]="remaining() <= 300" [class.danger]="remaining() <= 60">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                {{ clock() }}
              </div>
            </div>

            <div class="progress"><div [style.width.%]="progressPct()"></div></div>

            <div class="layout">
              <div class="panel question">
                <p class="qnum">Question {{ index() + 1 }} of {{ questions().length }} · {{ question.marks }} mark{{ question.marks === 1 ? '' : 's' }}</p>
                <h2>{{ question.question_text }}</h2>

                <div class="options">
                  @for (option of question.options; track $index) {
                    <button
                      type="button"
                      class="option"
                      [class.selected]="answers()[question.id] === $index"
                      (click)="choose(question.id, $index)"
                    >
                      <span class="letter">{{ letter($index) }}</span>
                      <span>{{ option }}</span>
                    </button>
                  }
                </div>

                <div class="actions between">
                  <button type="button" class="btn ghost" [disabled]="index() === 0" (click)="go(index() - 1)">Previous</button>
                  @if (index() < questions().length - 1) {
                    <button type="button" class="btn primary" (click)="go(index() + 1)">Next</button>
                  } @else {
                    <button type="button" class="btn success" (click)="confirmOpen.set(true)">Finish & Submit</button>
                  }
                </div>
              </div>

              <aside class="panel palette">
                <p class="qnum">Questions</p>
                <div class="grid">
                  @for (item of questions(); track item.id; let i = $index) {
                    <button
                      type="button"
                      class="dot"
                      [class.answered]="answers()[item.id] !== undefined"
                      [class.active]="i === index()"
                      (click)="go(i)"
                    >{{ i + 1 }}</button>
                  }
                </div>
                <button type="button" class="btn success block" (click)="confirmOpen.set(true)">Submit Quiz</button>
              </aside>
            </div>
          }
        }

        @case ('submitting') {
          <div class="panel center"><span class="spinner"></span> Submitting your answers…</div>
        }
      }
    </div>

    @if (confirmOpen()) {
      <div class="overlay">
        <div class="dialog">
          <h3>Submit quiz?</h3>
          <p>
            You answered <strong>{{ answeredCount() }}</strong> of <strong>{{ questions().length }}</strong> questions.
            @if (unansweredCount() > 0) {
              <span class="warn-text">{{ unansweredCount() }} unanswered question{{ unansweredCount() === 1 ? '' : 's' }} will get zero marks.</span>
            }
            You cannot change your answers after submitting.
          </p>
          <div class="actions">
            <button type="button" class="btn ghost" (click)="confirmOpen.set(false)">Keep working</button>
            <button type="button" class="btn success" (click)="submit(false)">Submit now</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px 16px 48px; }
    .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 4px rgb(15 23 42 / 4%); }
    .panel.center { text-align: center; padding: 48px 24px; color: #475569; }
    .kicker { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #1d4ed8; }
    h1 { margin: 6px 0 8px; font-size: 24px; font-weight: 900; color: #020617; }
    h2 { margin: 0 0 18px; font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.5; }
    .muted { color: #64748b; font-size: 13px; }
    .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .facts div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; }
    .facts strong { display: block; font-size: 22px; color: #0f172a; }
    .facts span { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
    .rules { margin: 0 0 20px; padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.8; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; }
    .actions.between { justify-content: space-between; margin-top: 24px; }
    .btn { border: 0; border-radius: 11px; padding: 11px 20px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn.primary { background: #1d4ed8; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #1e40af; }
    .btn.success { background: #16a34a; color: #fff; }
    .btn.success:hover:not(:disabled) { background: #15803d; }
    .btn.ghost { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
    .btn.block { width: 100%; margin-top: 16px; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
    .timer {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px;
      background: #dbeafe; color: #1d4ed8; font-weight: 900; font-variant-numeric: tabular-nums;
    }
    .timer.warn { background: #fef3c7; color: #b45309; }
    .timer.danger { background: #fee2e2; color: #b91c1c; animation: pulse 1s infinite; }
    @keyframes pulse { 50% { opacity: .55; } }
    .progress { height: 6px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-bottom: 16px; }
    .progress div { height: 100%; background: #1d4ed8; transition: width .25s ease; }
    .layout { display: grid; grid-template-columns: 1fr 240px; gap: 16px; align-items: start; }
    .qnum { margin: 0 0 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
    .options { display: flex; flex-direction: column; gap: 10px; }
    .option {
      display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px 16px;
      border: 1.5px solid #e2e8f0; border-radius: 12px; background: #fff; font: inherit; font-size: 14px;
      color: #1e293b; cursor: pointer; transition: border-color .15s ease, background .15s ease;
    }
    .option:hover { border-color: #93c5fd; background: #f8fafc; }
    .option.selected { border-color: #1d4ed8; background: #eff6ff; }
    .letter {
      flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; background: #f1f5f9; color: #475569;
      display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;
    }
    .option.selected .letter { background: #1d4ed8; color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .dot { height: 36px; border-radius: 9px; border: 1px solid #cbd5e1; background: #fff; font: inherit; font-weight: 700; font-size: 12px; cursor: pointer; color: #475569; }
    .dot.answered { background: #dcfce7; border-color: #86efac; color: #15803d; }
    .dot.active { outline: 2px solid #1d4ed8; outline-offset: 1px; }
    .overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgb(15 23 42 / 55%); padding: 16px; }
    .dialog { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgb(15 23 42 / 25%); }
    .dialog h3 { margin: 0 0 8px; font-size: 18px; font-weight: 900; }
    .dialog p { margin: 0 0 20px; color: #475569; font-size: 13.5px; line-height: 1.6; }
    .warn-text { display: block; color: #b45309; font-weight: 700; margin: 6px 0; }
    .spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid #cbd5e1; border-top-color: #1d4ed8; border-radius: 50%; vertical-align: -3px; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 799px) {
      .layout { grid-template-columns: 1fr; }
      .facts { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class TakeQuiz implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attemptService = inject(QuizAttemptService);
  private readonly toast = inject(Toast);

  readonly phase = signal<Phase>('loading');
  readonly error = signal('');
  readonly quiz = signal<PublishedQuiz | null>(null);
  readonly questions = signal<AttemptQuestion[]>([]);
  readonly attempt = signal<QuizAttempt | null>(null);
  readonly answers = signal<Record<number, number>>({});
  readonly index = signal(0);
  readonly remaining = signal(0);
  readonly starting = signal(false);
  readonly resuming = signal(false);
  readonly confirmOpen = signal(false);

  readonly current = computed(() => this.questions()[this.index()] ?? null);
  readonly answeredCount = computed(
    () => this.questions().filter((q) => this.answers()[q.id] !== undefined).length,
  );
  readonly unansweredCount = computed(() => this.questions().length - this.answeredCount());
  readonly progressPct = computed(() =>
    this.questions().length ? (this.answeredCount() / this.questions().length) * 100 : 0,
  );

  private quizId = 0;
  private offset = 0;
  private timer?: ReturnType<typeof setInterval>;
  private submitted = false;

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    void this.load();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  /** Quiz chal rahi ho aur tab band karne lagein to browser pooch le. */
  @HostListener('window:beforeunload', ['$event'])
  warnBeforeLeaving(event: BeforeUnloadEvent): void {
    if (this.phase() === 'running') event.preventDefault();
  }

  async load(): Promise<void> {
    if (!Number.isInteger(this.quizId) || this.quizId <= 0) {
      return this.fail('This quiz link is not valid.');
    }

    try {
      const [quiz, attempts] = await Promise.all([
        this.attemptService.getQuiz(this.quizId),
        this.attemptService.getMyAttempts(),
      ]);

      const existing = attempts.find((a) => a.quiz_id === this.quizId);

      // Pehle se submit / expire ho chuki attempt: seedha result
      if (
        existing &&
        (existing.status !== 'in_progress' || new Date(existing.ends_at).getTime() <= Date.now())
      ) {
        void this.router.navigate(['/student/quizzes/result', existing.id], { replaceUrl: true });
        return;
      }

      if (!existing) {
        if (quiz.status !== 'published') return this.fail('This quiz is not open.');
        if (isPastDeadline(quiz.deadline)) return this.fail('The deadline for this quiz has passed.');
      }

      this.quiz.set(quiz);
      this.resuming.set(!!existing);
      this.questions.set(await this.attemptService.getQuestions(this.quizId));

      if (this.questions().length === 0) return this.fail('This quiz has no questions yet.');

      this.phase.set('intro');
    } catch (e) {
      this.fail((e as Error).message || 'Please try again.');
    }
  }

  async start(): Promise<void> {
    this.starting.set(true);
    try {
      this.offset = await this.attemptService.getServerOffset();
      const attempt = await this.attemptService.startAttempt(this.quizId);

      if (attempt.status !== 'in_progress') {
        void this.router.navigate(['/student/quizzes/result', attempt.id], { replaceUrl: true });
        return;
      }

      this.attempt.set(attempt);
      this.restoreAnswers(attempt);
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
      this.phase.set('running');
    } catch (e) {
      this.toast.error((e as Error).message || 'Please try again.', 'Unable to start quiz');
    } finally {
      this.starting.set(false);
    }
  }

  choose(questionId: number, option: number): void {
    this.answers.update((current) => ({ ...current, [questionId]: option }));
  }

  go(i: number): void {
    if (i >= 0 && i < this.questions().length) this.index.set(i);
  }

  async submit(auto: boolean): Promise<void> {
    const attempt = this.attempt();
    if (!attempt || this.submitted) return;

    this.submitted = true;
    this.confirmOpen.set(false);
    this.stopTimer();
    this.phase.set('submitting');

    if (auto) {
      this.toast.warning('Your time is up. Submitting your answers now.', 'Time up');
    }

    try {
      const result = await this.attemptService.submitAttempt(attempt.id, this.answers());
      void this.router.navigate(['/student/quizzes/result', result.id ?? attempt.id], {
        replaceUrl: true,
      });
    } catch (e) {
      // Server ne shayad pehle hi band kar di ho (waqt khatam): result dekhne ki koshish karo
      try {
        const saved = await this.attemptService.getAttempt(attempt.id);
        if (saved.status !== 'in_progress') {
          void this.router.navigate(['/student/quizzes/result', saved.id], { replaceUrl: true });
          return;
        }
      } catch {
        // neeche wala error dikhayenge
      }

      this.submitted = false;
      this.toast.error((e as Error).message || 'Please try again.', 'Unable to submit');
      this.phase.set('running');
      this.timer = setInterval(() => this.tick(), 1000);
    }
  }

  clock(): string {
    const total = Math.max(0, this.remaining());
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  letter(i: number): string {
    return String.fromCharCode(65 + i);
  }

  back(): void {
    void this.router.navigate(['/student/quizzes']);
  }

  private tick(): void {
    const attempt = this.attempt();
    if (!attempt) return;

    const endsAt = new Date(attempt.ends_at).getTime();
    const left = Math.max(0, Math.floor((endsAt - (Date.now() + this.offset)) / 1000));
    this.remaining.set(left);

    if (left <= 0 && this.phase() === 'running') void this.submit(true);
  }

  private restoreAnswers(attempt: QuizAttempt): void {
    const saved = attempt.answers;
    if (!saved) return;

    const restored: Record<number, number> = {};
    for (const [key, value] of Object.entries(saved)) restored[Number(key)] = value;
    this.answers.set(restored);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('error');
  }
}