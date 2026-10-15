
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  LiveClass,
  LiveClassService,
} from '../../core/services/liveclass.service';

import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

type ClassState = 'live' | 'soon' | 'upcoming' | 'ended' | 'cancelled';

const JOIN_EARLY_MINUTES = 10;

@Component({
  selector: 'app-student-live-classes',
  standalone: true,
  template: `
    <div class="page-head">
      <span class="kicker">STUDENT PORTAL / LEARNING</span>
      <h1>Live Classes</h1>
      <p>Apni scheduled classes dekhein aur meeting link se class join karein.</p>
    </div>

    @if (loading()) {
      <div class="state">
        <span class="spinner"></span>
        Loading live classes...
      </div>
    } @else {
      <div class="summary">
        <div class="summary-card">
          <span class="summary-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/>
              <path d="M16 3v4M8 3v4M3 10h18"/>
            </svg>
          </span>
          <div>
            <span class="summary-label">Total Classes</span>
            <strong>{{ classes().length }}</strong>
          </div>
        </div>

        <div class="summary-card">
          <span class="summary-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="m10 8 6 4-6 4V8Z"/>
            </svg>
          </span>
          <div>
            <span class="summary-label">Live Now</span>
            <strong>{{ liveCount() }}</strong>
          </div>
        </div>

        <div class="summary-card">
          <span class="summary-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
          </span>
          <div>
            <span class="summary-label">Upcoming</span>
            <strong>{{ upcomingCount() }}</strong>
          </div>
        </div>
      </div>

      @if (classes().length === 0) {
        <div class="empty-card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/>
              <path d="M16 3v4M8 3v4M3 10h18"/>
            </svg>
          </div>
          <h2>No classes scheduled</h2>
          <p>Abhi aapke batch ki koi live class schedule nahi hai.</p>
        </div>
      } @else {
        <section class="section">
          <div class="section-heading">
            <div>
              <h2>Live & Upcoming</h2>
              <p>Apni current aur aane wali classes dekhein.</p>
            </div>
            <span class="count-pill">{{ current().length }} classes</span>
          </div>

          @if (current().length === 0) {
            <div class="small-empty">
              Filhal koi live ya upcoming class nahi hai.
            </div>
          }

          <div class="class-list">
            @for (c of current(); track c.id) {
              <article
                class="class-card"
                [class.live-card]="state(c) === 'live'"
                [class.cancelled-card]="state(c) === 'cancelled'"
              >
                <div class="class-main">
                  <div class="class-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2"/>
                      <path d="m10 9 5 3-5 3V9Z"/>
                    </svg>
                  </div>

                  <div class="class-content">
                    <div class="title-row">
                      <h3>{{ c.title }}</h3>

                      @if (state(c) === 'live') {
                        <span class="status live-status">
                          <span class="status-dot"></span>
                          Live now
                        </span>
                      } @else if (state(c) === 'soon') {
                        <span class="status soon-status">Starting soon</span>
                      } @else if (state(c) === 'cancelled') {
                        <span class="status cancelled-status">Cancelled</span>
                      } @else {
                        <span class="status upcoming-status">Upcoming</span>
                      }
                    </div>

                    <div class="metadata">
                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
                        </svg>
                        {{ c.course_batches?.courses?.title || 'Course' }}
                      </span>

                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="10" cy="7" r="4"/>
                          <path d="M20 8v6M23 11h-6"/>
                        </svg>
                        {{ c.course_batches?.batch_name || 'Batch' }}
                      </span>

                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="M12 7v5l3 2"/>
                        </svg>
                        {{ c.duration_minutes }} min
                      </span>
                    </div>

                    <div class="date-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2"/>
                        <path d="M16 3v4M8 3v4M3 10h18"/>
                      </svg>
                      {{ formatDate(c.scheduled_at) }}
                    </div>

                    @if (c.description) {
                      <p class="description">{{ c.description }}</p>
                    }

                    @if (
                      state(c) === 'upcoming' &&
                      !c.meeting_link
                    ) {
                      <p class="link-note">
                        Meeting link abhi available nahi hai.
                      </p>
                    }
                  </div>
                </div>

                <div class="class-action">
                  @if (
                    (state(c) === 'live' || state(c) === 'soon') &&
                    c.meeting_link
                  ) {
                    <a
                      [href]="c.meeting_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="join-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 3h6v6"/>
                        <path d="m10 14 11-11"/>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      </svg>
                      Open Meeting Link
                    </a>
                  } @else if (state(c) === 'upcoming') {
                    <span class="waiting-note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 7v5l3 2"/>
                      </svg>
                      Join 10 min pehle
                    </span>
                  }
                </div>
              </article>
            }
          </div>
        </section>

        @if (past().length > 0) {
          <section class="section past-section">
            <div class="section-heading">
              <div>
                <h2>Past Classes</h2>
                <p>Ye classes apna scheduled time complete kar chuki hain.</p>
              </div>
              <span class="count-pill">{{ past().length }} completed</span>
            </div>

            <div class="class-list">
              @for (c of past(); track c.id) {
                <article class="class-card past-card">
                  <div class="class-main">
                    <div class="class-icon past-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="m8 12 3 3 5-6"/>
                      </svg>
                    </div>

                    <div class="class-content">
                      <div class="title-row">
                        <h3>{{ c.title }}</h3>
                        <span class="status ended-status">Expired</span>
                      </div>

                      <div class="metadata">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
                          </svg>
                          {{ c.course_batches?.courses?.title || 'Course' }}
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M12 7v5l3 2"/>
                          </svg>
                          {{ c.duration_minutes }} min
                        </span>
                      </div>

                      <div class="date-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="5" width="18" height="16" rx="2"/>
                          <path d="M16 3v4M8 3v4M3 10h18"/>
                        </svg>
                        {{ formatDate(c.scheduled_at) }}
                      </div>
                    </div>
                  </div>

                  @if (c.meeting_link) {
                    <div class="class-action">
                      <a
                        [href]="c.meeting_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="past-link"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M15 3h6v6"/>
                          <path d="m10 14 11-11"/>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        </svg>
                        Open Link
                      </a>
                    </div>
                  }
                </article>
              }
            </div>
          </section>
        }
      }
    }
  `,
  styles: [PAGE_STYLES, `
    :host {
      display: block;
      min-width: 0;
      color: #0f172a;
    }

    .page-head {
      margin-bottom: 24px;
    }

    .page-head .kicker {
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .15em;
    }

    .page-head h1 {
      margin: 8px 0 6px;
      color: #020617;
      font-size: clamp(24px, 3vw, 30px);
      font-weight: 750;
      letter-spacing: -.035em;
      line-height: 1.2;
    }

    .page-head p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.7;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 30px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
      padding: 17px;
      border: 1px solid #e2e8f0;
      border-radius: 15px;
      background: #fff;
      box-shadow: 0 2px 5px rgb(15 23 42 / 3%);
    }

    .summary-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 auto;
      border-radius: 12px;
    }

    .summary-icon svg {
      width: 21px;
      height: 21px;
    }

    .summary-icon.blue { background: #eff6ff; color: #1d4ed8; }
    .summary-icon.green { background: #ecfdf5; color: #15803d; }
    .summary-icon.purple { background: #f5f3ff; color: #6d28d9; }

    .summary-card > div {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .summary-label {
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
    }

    .summary-card strong {
      color: #0f172a;
      font-size: 23px;
      line-height: 1.2;
      font-weight: 700;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .section-heading h2 {
      margin: 0 0 5px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -.02em;
    }

    .section-heading p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.6;
    }

    .count-pill {
      flex: 0 0 auto;
      padding: 6px 10px;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 650;
    }

    .class-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .class-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-width: 0;
      padding: 19px;
      border: 1px solid #e2e8f0;
      border-radius: 15px;
      background: #fff;
      box-shadow: 0 2px 5px rgb(15 23 42 / 3%);
      transition: border-color .18s ease, box-shadow .18s ease;
    }

    .class-card:hover {
      border-color: #bfdbfe;
      box-shadow: 0 6px 18px rgb(15 23 42 / 5%);
    }

    .class-card.live-card {
      border-color: #bbf7d0;
      background: #fcfffd;
    }

    .class-card.cancelled-card {
      border-color: #fecaca;
      background: #fffdfd;
    }

    .class-main {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .class-icon {
      display: grid;
      place-items: center;
      width: 43px;
      height: 43px;
      flex: 0 0 auto;
      border-radius: 12px;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .class-icon svg {
      width: 21px;
      height: 21px;
    }

    .live-card .class-icon {
      background: #dcfce7;
      color: #15803d;
    }

    .cancelled-card .class-icon {
      background: #fee2e2;
      color: #b91c1c;
    }

    .class-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 9px;
    }

    .title-row h3 {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
      line-height: 1.5;
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 650;
      white-space: nowrap;
    }

    .live-status { background: #dcfce7; color: #166534; }
    .soon-status { background: #fef3c7; color: #92400e; }
    .upcoming-status { background: #eff6ff; color: #1d4ed8; }
    .cancelled-status { background: #fee2e2; color: #991b1b; }
    .ended-status { background: #f1f5f9; color: #475569; }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
      animation: pulse 1.6s infinite;
    }

    .metadata {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
    }

    .metadata span,
    .date-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      color: #64748b;
      font-size: 11px;
      font-weight: 400;
      overflow-wrap: anywhere;
    }

    .metadata svg,
    .date-row svg {
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      color: #94a3b8;
    }

    .date-row {
      color: #334155;
      font-size: 11.5px;
    }

    .description {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.7;
      overflow-wrap: anywhere;
    }

    .class-action {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex: 0 0 auto;
    }

    .join-btn,
    .past-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 39px;
      padding: 10px 13px;
      border: 1px solid transparent;
      border-radius: 9px;
      text-decoration: none;
      font-family: inherit;
      font-size: 11px;
      font-weight: 650;
      transition: background .18s ease, border-color .18s ease;
    }

    .join-btn {
      background: #1d4ed8;
      color: #fff;
    }

    .join-btn:hover {
      background: #1e40af;
    }

    .join-btn svg,
    .past-link svg {
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
    }

    .past-link {
      border-color: #e2e8f0;
      background: #fff;
      color: #475569;
    }

    .past-link:hover {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .waiting-note {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
      font-size: 10.5px;
      font-weight: 500;
      white-space: nowrap;
    }

    .waiting-note svg {
      width: 15px;
      height: 15px;
    }

    .link-note {
      margin: 0;
      color: #b45309;
      font-size: 11px;
      font-weight: 400;
    }

    .past-card {
      background: #f8fafc;
    }

    .past-icon {
      background: #e2e8f0;
      color: #475569;
    }

    .past-card .title-row h3 {
      color: #475569;
    }

    .small-empty {
      padding: 22px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      color: #64748b;
      background: #fff;
      font-size: 12px;
      text-align: center;
    }

    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 52px 20px;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      background: #fff;
      text-align: center;
    }

    .empty-icon {
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      margin-bottom: 14px;
      border-radius: 15px;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .empty-icon svg {
      width: 26px;
      height: 26px;
    }

    .empty-card h2 {
      margin: 0 0 7px;
      color: #0f172a;
      font-size: 15px;
      font-weight: 650;
    }

    .empty-card p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.7;
    }

    @keyframes pulse {
      50% { opacity: .45; }
    }

    @media (max-width: 760px) {
      .summary {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .summary-card {
        padding: 14px;
      }

      .class-card {
        align-items: flex-start;
        flex-direction: column;
        gap: 16px;
        padding: 15px;
      }

      .class-main {
        width: 100%;
        gap: 11px;
      }

      .class-action {
        width: 100%;
        justify-content: flex-start;
        padding-left: 54px;
      }

      .join-btn,
      .past-link {
        width: 100%;
      }

      .waiting-note {
        white-space: normal;
      }

      .section-heading {
        align-items: flex-start;
      }
    }

    @media (max-width: 420px) {
      .class-icon {
        width: 36px;
        height: 36px;
      }

      .class-action {
        padding-left: 47px;
      }

      .metadata {
        gap: 8px 12px;
      }

      .count-pill {
        font-size: 9px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .status-dot {
        animation: none;
      }

      .class-card,
      .join-btn,
      .past-link {
        transition: none;
      }
    }
  `],
})
export class StudentLiveClasses implements OnInit, OnDestroy {
  private readonly liveService = inject(LiveClassService);
  private readonly toast = inject(Toast);

  readonly JOIN_EARLY_MINUTES = JOIN_EARLY_MINUTES;

  readonly classes = signal<LiveClass[]>([]);
  readonly loading = signal(true);

  private readonly now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  readonly current = computed(() =>
    this.classes().filter((c) => {
      const currentState = this.state(c);
      return currentState !== 'ended';
    }),
  );

  readonly past = computed(() =>
    this.classes()
      .filter((c) => this.state(c) === 'ended')
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() -
          new Date(a.scheduled_at).getTime(),
      ),
  );

  readonly liveCount = computed(() =>
    this.classes().filter((c) => this.state(c) === 'live').length,
  );

  readonly upcomingCount = computed(() =>
    this.classes().filter((c) => {
      const s = this.state(c);
      return s === 'upcoming' || s === 'soon';
    }).length,
  );

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(Date.now()), 30_000);
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);

    try {
      this.classes.set(await this.liveService.getForMyBatches());
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message ||
          'Live classes load nahi ho sakin.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  state(c: LiveClass): ClassState {
    if (c.status === 'Cancelled') {
      return 'cancelled';
    }

    const now = this.now();
    const start = new Date(c.scheduled_at).getTime();
    const end = start + c.duration_minutes * 60_000;

    if (Number.isNaN(start)) {
      return 'upcoming';
    }

    if (now >= end) {
      return 'ended';
    }

    if (now >= start) {
      return 'live';
    }

    if (now >= start - JOIN_EARLY_MINUTES * 60_000) {
      return 'soon';
    }

    return 'upcoming';
  }

  formatDate(iso: string): string {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return 'Date not available';
    }

    return date.toLocaleString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
