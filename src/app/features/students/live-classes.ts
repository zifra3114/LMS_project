
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { LiveClass, LiveClassService } from '../../core/services/liveclass.service';
import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

type ClassState = 'live' | 'soon' | 'upcoming' | 'ended' | 'cancelled';

/** Join button class shuru hone se itne minute pehle khul jata hai. */
const JOIN_EARLY_MINUTES = 10;

@Component({
  selector: 'app-student-live-classes',
  standalone: true,
  template: `
    <div class="page-head">
      <span class="kicker">Scheduled Learning</span>
      <h1>Live Classes</h1>
      <p>Aapke batch ki live classes yahan nazar aayengi.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading...</div>
    } @else if (classes().length === 0) {
      <div class="state">
        <strong>No classes scheduled</strong>
        Abhi aapke batch ki koi live class schedule nahi hai.
      </div>
    } @else {
      <!-- Live / Upcoming -->
      <section class="section">
        <h2 class="section-title">Live & Upcoming</h2>

        @if (current().length === 0) {
          <p class="empty-msg">Koi upcoming class nahi.</p>
        }

        <div class="class-list">
          @for (c of current(); track c.id) {
            <div class="class-item" [class.live]="state(c) === 'live'">
              <div class="class-body">
                <div class="class-head">
                  <h3>{{ c.title }}</h3>
                  @if (state(c) === 'live') {
                    <span class="badge live-badge">Live now</span>
                  } @else if (state(c) === 'cancelled') {
                    <span class="badge cancelled-badge">Cancelled</span>
                  }
                </div>
                <p class="class-meta">
                  {{ c.course_batches?.courses?.title }} · {{ c.course_batches?.batch_name }}
                </p>
                <p class="class-time">
                  {{ formatDate(c.scheduled_at) }} · {{ c.duration_minutes }} min
                </p>
                @if (c.description) {
                  <p class="class-desc">{{ c.description }}</p>
                }
              </div>

              @if (state(c) === 'live' || state(c) === 'soon') {
                <a
                  [href]="c.meeting_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="join-btn"
                >
                  Join Class
                </a>
              } @else if (state(c) === 'upcoming') {
                <span class="soon-msg">
                  Join {{ JOIN_EARLY_MINUTES }} min pehle khulega
                </span>
              }
            </div>
          }
        </div>
      </section>

      <!-- Past -->
      @if (past().length > 0) {
        <section class="section">
          <h2 class="section-title">Past Classes</h2>
          <div class="past-list">
            @for (c of past(); track c.id) {
              <div class="past-item">
                <h3>{{ c.title }}</h3>
                <p>{{ c.course_batches?.batch_name }} · {{ formatDate(c.scheduled_at) }}</p>
              </div>
            }
          </div>
        </section>
      }
    }
  `,
  styles: [PAGE_STYLES, `
    .section { margin-bottom: 24px; }
    .section-title { margin: 0 0 14px; font-size: 14px; font-weight: 900; color: #020617; }
    .empty-msg { margin: 0; color: #64748b; font-size: 12.5px; }

    .class-list { display: flex; flex-direction: column; gap: 12px; }
    .class-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; padding: 18px; box-shadow: 0 2px 4px rgb(15 23 42 / 4%); transition: border-color .18s ease, box-shadow .18s ease; }
    .class-item.live { border-color: #86efac; background: #f0fdf4; }
    .class-item:hover { border-color: #93c5fd; box-shadow: 0 10px 24px rgb(15 23 42 / 8%); }

    .class-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1 1 auto; }
    .class-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .class-head h3 { margin: 0; font-size: 15px; font-weight: 900; color: #020617; }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; }
    .live-badge { background: #dcfce7; color: #15803d; }
    .cancelled-badge { background: #fee2e2; color: #991b1b; }
    .class-meta { margin: 0; color: #64748b; font-size: 11px; }
    .class-time { margin: 0; color: #020617; font-size: 12.5px; font-weight: 700; }
    .class-desc { margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; }

    .join-btn { flex: 0 0 auto; padding: 11px 18px; border-radius: 11px; background: #16a34a; color: #fff; font-size: 12px; font-weight: 800; text-decoration: none; transition: background .2s ease; }
    .join-btn:hover { background: #15803d; }
    .soon-msg { flex: 0 0 auto; padding: 9px 14px; border-radius: 10px; background: #f1f5f9; color: #64748b; font-size: 10.5px; font-weight: 700; }

    .past-list { display: flex; flex-direction: column; gap: 10px; }
    .past-item { border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; padding: 14px 16px; }
    .past-item h3 { margin: 0 0 5px; font-size: 13px; font-weight: 800; color: #334155; }
    .past-item p { margin: 0; color: #64748b; font-size: 11px; }

    @media (max-width: 639px) {
      .class-item { flex-direction: column; align-items: flex-start; }
      .join-btn, .soon-msg { width: 100%; text-align: center; }
    }
  `],
})
export class StudentLiveClasses implements OnInit, OnDestroy {
  private readonly liveService = inject(LiveClassService);
  private readonly toast = inject(Toast);

  readonly JOIN_EARLY_MINUTES = JOIN_EARLY_MINUTES;

  readonly classes = signal<LiveClass[]>([]);
  readonly loading = signal(true);

  /** Har 30 second mein update hota hai taake "Live now" / Join button khud badal jaye. */
  private readonly now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  readonly current = computed(() =>
    this.classes().filter((c) => this.state(c) !== 'ended'),
  );

  readonly past = computed(() =>
    this.classes()
      .filter((c) => this.state(c) === 'ended')
      .reverse(),
  );

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(Date.now()), 30_000);
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.classes.set(await this.liveService.getForMyBatches());
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Live classes load nahi ho sakin.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  state(c: LiveClass): ClassState {
    if (c.status === 'Cancelled') return 'cancelled';

    const now = this.now();
    const start = new Date(c.scheduled_at).getTime();
    const end = start + c.duration_minutes * 60_000;

    if (now > end) return 'ended';
    if (now >= start) return 'live';
    if (now >= start - JOIN_EARLY_MINUTES * 60_000) return 'soon';
    return 'upcoming';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}