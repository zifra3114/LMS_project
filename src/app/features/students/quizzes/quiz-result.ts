import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  AttemptWithQuiz,
  QuizAttemptService,
  percent,
} from '../../../core/services/quiz-attempt.service';
import { Toast } from '../../../core/services/toast.service';

interface Piece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  spin: number;
}

const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#facc15'];
const CELEBRATION_MS = 7000;

@Component({
  selector: 'app-quiz-result',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="panel center"><span class="spinner"></span> Loading your result…</div>
    } @else if (error()) {
      <div class="panel center">
        <h2>Unable to load result</h2>
        <p class="muted">{{ error() }}</p>
        <button type="button" class="btn primary" (click)="back()">Back to quizzes</button>
      </div>
    }

    @if (celebrating()) {
      <div class="celebrate" role="dialog" aria-label="Congratulations">
        @for (p of pieces; track $index) {
          <span
            class="confetti"
            [style.left.%]="p.left"
            [style.width.px]="p.size"
            [style.height.px]="p.size * 0.6"
            [style.background]="p.color"
            [style.animation-delay.s]="p.delay"
            [style.animation-duration.s]="p.duration"
            [style.--spin]="p.spin + 'deg'"
          ></span>
        }

        <div class="celebrate-card">
          <svg class="trophy" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 8h24v16a12 12 0 0 1-24 0V8z" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
            <path d="M20 12H10c0 10 4 16 12 17M44 12h10c0 10-4 16-12 17" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M32 36v8M22 56h20M26 44h12v12H26z" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="#fcd34d"/>
          </svg>
          <h1>Congratulations!</h1>
          <p class="lead">You scored the highest marks in this quiz.</p>
          <div class="big-score">{{ attempt()?.score ?? 0 }}<small>/{{ attempt()?.total_marks ?? 0 }}</small></div>
          <p class="sub">{{ attempt()?.quizzes?.title }}</p>
          <button type="button" class="btn light" (click)="showResult()">See my result</button>
        </div>
      </div>
    }

    @if (!loading() && !error() && !celebrating()) {
      @if (attempt(); as a) {
        <div class="wrap">
          <div class="panel result">
            <span class="kicker">Quiz result</span>
            <h1>{{ a.quizzes?.title }}</h1>

            <div class="ring" [class.pass]="a.passed" [class.fail]="!a.passed" [style.--p]="pct() + '%'">
              <div class="ring-inner">
                <strong>{{ pct() }}%</strong>
                <span>{{ a.score ?? 0 }} / {{ a.total_marks ?? 0 }}</span>
              </div>
            </div>

            <div class="verdict" [class.pass]="a.passed" [class.fail]="!a.passed">
              {{ a.passed ? 'You passed' : 'You did not pass' }}
            </div>

            @if (isHighest()) {
              <p class="top-note">🏆 You have the highest score in this quiz.</p>
            }

            <div class="facts">
              <div><strong>{{ a.score ?? 0 }}</strong><span>Your marks</span></div>
              <div><strong>{{ a.quizzes?.passing_marks ?? 0 }}</strong><span>Passing marks</span></div>
              <div><strong>{{ a.total_marks ?? 0 }}</strong><span>Total marks</span></div>
              <div><strong>{{ timeTaken() }}</strong><span>Time taken</span></div>
            </div>

            @if (a.status === 'expired') {
              <p class="muted">This attempt ended when the time ran out.</p>
            }

            <button type="button" class="btn primary" (click)="back()">Back to quizzes</button>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; }
    .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 2px 4px rgb(15 23 42 / 4%); }
    .panel.center { max-width: 480px; margin: 48px auto; text-align: center; color: #475569; }
    .panel.result { text-align: center; padding: 32px 24px; }
    .kicker { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #1d4ed8; }
    h1 { margin: 6px 0 20px; font-size: 22px; font-weight: 900; color: #020617; }
    .muted { color: #64748b; font-size: 13px; }
    .ring {
      --p: 0%; width: 170px; height: 170px; margin: 0 auto 16px; border-radius: 50%;
      background: conic-gradient(var(--c, #1d4ed8) var(--p), #e2e8f0 0); display: grid; place-items: center;
      animation: grow .9s ease-out;
    }
    .ring.pass { --c: #16a34a; }
    .ring.fail { --c: #dc2626; }
    .ring-inner { width: 138px; height: 138px; border-radius: 50%; background: #fff; display: grid; place-content: center; }
    .ring-inner strong { font-size: 34px; font-weight: 900; color: #0f172a; line-height: 1; }
    .ring-inner span { font-size: 12px; color: #64748b; margin-top: 4px; }
    @keyframes grow { from { transform: scale(.85); opacity: 0; } }
    .verdict { display: inline-block; padding: 7px 18px; border-radius: 999px; font-weight: 800; font-size: 13px; }
    .verdict.pass { background: #dcfce7; color: #15803d; }
    .verdict.fail { background: #fee2e2; color: #b91c1c; }
    .top-note { margin: 14px 0 0; font-weight: 800; color: #b45309; }
    .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 24px 0; }
    .facts div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 6px; }
    .facts strong { display: block; font-size: 18px; color: #0f172a; }
    .facts span { font-size: 10.5px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
    .btn { border: 0; border-radius: 11px; padding: 11px 22px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
    .btn.primary { background: #1d4ed8; color: #fff; }
    .btn.primary:hover { background: #1e40af; }
    .btn.light { background: #fff; color: #7c2d12; margin-top: 22px; padding: 12px 26px; }
    .spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid #cbd5e1; border-top-color: #1d4ed8; border-radius: 50%; vertical-align: -3px; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Full-screen celebration */
    .celebrate {
      position: fixed; inset: 0; z-index: 100; overflow: hidden; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 35%, #7c3aed 0%, #4c1d95 45%, #1e1b4b 100%);
      animation: fade .4s ease-out;
    }
    @keyframes fade { from { opacity: 0; } }
    .celebrate-card { position: relative; z-index: 2; text-align: center; color: #fff; padding: 24px; animation: pop .7s cubic-bezier(.2,1.4,.4,1) both; }
    @keyframes pop { from { transform: scale(.4); opacity: 0; } }
    .trophy { width: 120px; height: 120px; filter: drop-shadow(0 8px 24px rgb(251 191 36 / 55%)); animation: bounce 1.6s ease-in-out infinite; }
    @keyframes bounce { 50% { transform: translateY(-14px) rotate(-3deg); } }
    .celebrate-card h1 {
      margin: 12px 0 6px; font-size: clamp(34px, 7vw, 64px); font-weight: 900; color: #fff;
      text-shadow: 0 4px 24px rgb(0 0 0 / 35%);
    }
    .lead { margin: 0; font-size: clamp(15px, 2.6vw, 20px); color: #e9d5ff; font-weight: 600; }
    .big-score { margin-top: 18px; font-size: clamp(48px, 9vw, 84px); font-weight: 900; color: #fde68a; line-height: 1; }
    .big-score small { font-size: .4em; color: #ddd6fe; }
    .sub { margin: 10px 0 0; color: #c4b5fd; font-size: 14px; }
    .confetti {
      position: absolute; top: -20px; border-radius: 2px; opacity: 0; z-index: 1;
      animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite;
    }
    @keyframes fall {
      0% { transform: translateY(-5vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(var(--spin, 540deg)); opacity: .9; }
    }
    @media (prefers-reduced-motion: reduce) {
      .confetti, .trophy, .ring, .celebrate, .celebrate-card { animation: none; }
      .confetti { display: none; }
    }
    @media (max-width: 559px) { .facts { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class QuizResult implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attemptService = inject(QuizAttemptService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(Toast);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly attempt = signal<AttemptWithQuiz | null>(null);
  readonly isHighest = signal(false);
  readonly celebrating = signal(false);

  readonly pieces: Piece[] = Array.from({ length: 80 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3.5 + Math.random() * 3,
    size: 8 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    spin: 360 + Math.floor(Math.random() * 720),
  }));

  private autoClose?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.autoClose) clearTimeout(this.autoClose);
  }

  async load(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('attemptId'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('This result link is not valid.');
      this.loading.set(false);
      return;
    }

    try {
      const attempt = await this.attemptService.getAttempt(id);

      // Quiz abhi chal rahi hai: wapas quiz screen par
      if (attempt.status === 'in_progress' && new Date(attempt.ends_at).getTime() > Date.now()) {
        void this.router.navigate(['/student/quizzes', attempt.quiz_id, 'take'], { replaceUrl: true });
        return;
      }

      this.attempt.set(attempt);
      this.isHighest.set(await this.checkHighest(attempt));

      if (this.isHighest()) {
        this.celebrating.set(true);
        this.autoClose = setTimeout(() => this.showResult(), CELEBRATION_MS);
      }
    } catch (e) {
      this.error.set((e as Error).message || 'Please try again.');
      this.toast.error((e as Error).message || 'Please try again.', 'Unable to load result');
    } finally {
      this.loading.set(false);
    }
  }

  showResult(): void {
    if (this.autoClose) clearTimeout(this.autoClose);
    this.celebrating.set(false);
  }

  pct(): number {
    const a = this.attempt();
    return a ? percent(a.score, a.total_marks) : 0;
  }

  timeTaken(): string {
    const a = this.attempt();
    if (!a?.submitted_at) return '—';

    const seconds = Math.max(
      0,
      Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000),
    );
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  back(): void {
    void this.router.navigate(['/student/quizzes']);
  }

  /** Is quiz mein sab se zyada number isi student ke hain? (server function `quiz_top_score`) */
  private async checkHighest(attempt: AttemptWithQuiz): Promise<boolean> {
    if (attempt.score === null || attempt.score <= 0) return false;

    const { data, error } = await this.supabase.client.rpc('quiz_top_score', {
      p_quiz_id: attempt.quiz_id,
    });

    if (error || data === null || data === undefined) return false;

    return attempt.score >= Number(data);
  }
}