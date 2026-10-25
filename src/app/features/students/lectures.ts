import { Component, OnInit, inject, signal } from '@angular/core';
import {
  Lecture,
  LectureService,
  formatDuration,
} from '../../core/services/lecture.service';
import { Toast } from '../../core/services/toast.service';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

@Component({
  selector: 'app-student-lectures',
  standalone: true,
  imports: [VideoPlayerComponent],
  template: `
    <main class="lectures-page">
      <header class="page-head">
        <div>
          <span class="kicker">STUDENT PORTAL / LEARNING</span>
          <h1>Recorded Lectures</h1>
          <p>Watch your recorded lessons, revisit chapters, and learn at your own pace.</p>
        </div>
a
        <div class="lecture-total">
          <span class="total-icon">
            <svg viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="m10 9 5 3-5 3z" />
            </svg>
          </span>
          <span class="total-copy">
            <strong>{{ lectures().length }}</strong>
            <small>Total Lectures</small>
          </span>
        </div>
      </header>

      <!-- Lectures Hero / Library Header -->
      <section class="lecture-section">
        <div class="section-head">
          <div>
            <h2>Your Learning Library</h2>
            <p>All published lectures for your enrolled batch appear here.</p>
          </div>

          @if (!loading() && lectures().length > 0) {
            <span class="read-only-tag">
              {{ lectures().length }}
              {{ lectures().length === 1 ? 'lecture' : 'lectures' }}
            </span>
          }
        </div>

        @if (loading()) {
          <div class="state-card">
            <span class="spinner"></span>
            <h2>Loading your lectures</h2>
            <p>Please wait while we sync your learning library from the server.</p>
          </div>
        } @else if (lectures().length === 0) {
          <div class="state-card">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.7">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m10 9 5 3-5 3z" />
              </svg>
            </div>
            <h2>No recorded lectures yet</h2>
            <p>
              Your instructor has not published any recorded lectures
              for your batch yet. Please check back later.
            </p>
          </div>
        } @else {
          <div class="cards">
            @for (l of lectures(); track l.id) {
              <article class="lec-card-wrapper">
                <button
                  type="button"
                  class="lec-card"
                  [class.disabled]="!canPlay(l)"
                  [attr.aria-disabled]="!canPlay(l)"
                  [attr.aria-label]="
                    canPlay(l) ? 'Play ' + l.title : l.title + ' is not ready'
                  "
                  (click)="openLecture(l)"
                >
                  <div class="lec-thumb">
                    <div class="thumbnail-pattern">
                      <span class="pattern-circle circle-one"></span>
                      <span class="pattern-circle circle-two"></span>

                      <svg class="thumbnail-video-icon"
                        viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.3">
                        <rect x="3" y="5" width="18" height="14" rx="2.5" />
                        <path d="m10 9 5 3-5 3z" fill="currentColor" />
                      </svg>
                    </div>

                    @if (canPlay(l)) {
                      <span class="play-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                      <span class="thumbnail-label">RECORDED LECTURE</span>
                    } @else {
                      <span class="status-badge"
                        [attr.data-status]="l.processing_status">
                        {{ getStatus(l) }}
                      </span>
                    }

                    @if (l.duration_minutes && canPlay(l)) {
                      <span class="duration-badge">
                        <svg viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {{ duration(l.duration_minutes) }}
                      </span>
                    }
                  </div>

                  <div class="lec-body">
                    <div class="lec-label-row">
                      <span class="course-label">
                        {{ l.course_batches?.courses?.title || 'Course Lecture' }}
                      </span>
                      <span class="availability-dot"
                        [class.ready]="canPlay(l)"
                        [class.not-ready]="!canPlay(l)">
                      </span>
                    </div>

                    <h3>{{ l.title }}</h3>

                    @if (l.description) {
                      <p class="lec-description">{{ l.description }}</p>
                    } @else {
                      <p class="lec-description muted-description">
                        Recorded lesson for your continuous learning progress.
                      </p>
                    }

                    <div class="lec-divider"></div>

                    <div class="lec-footer">
                      <div class="batch-info">
                        <svg viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="1.7">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>
                          {{ l.course_batches?.batch_name || 'My Batch' }}
                        </span>
                      </div>

                      @if (canPlay(l)) {
                        <span class="watch-link">
                          Watch now
                          <svg viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      } @else {
                        <span class="pending-text">{{ getStatus(l) }}</span>
                      }
                    </div>

                    @if (!canPlay(l)) {
                      <div class="lec-warning">
                        <svg viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="1.8">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 8v4m0 4h.01" />
                        </svg>
                        {{ getStatusMessage(l) }}
                      </div>
                    }
                  </div>
                </button>
              </article>
            }
          </div>
        }
      </section>
    </main>

    @if (playing(); as p) {
      <div
        class="player-overlay"
        (click)="playing.set(null)"
        (keydown.escape)="playing.set(null)"
      >
        <section
          class="player-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'Recorded lecture: ' + p.title"
          (click)="$event.stopPropagation()"
        >
          <header class="player-head">
            <div class="player-title-group">
              <span class="player-eyebrow">NOW PLAYING</span>
              <h2>{{ p.title }}</h2>
              <p>
                {{ p.course_batches?.courses?.title || 'Course Lecture' }}
                ·
                {{ p.course_batches?.batch_name || 'My Batch' }}
              </p>
            </div>

            <button
              type="button"
              class="close-btn"
              (click)="playing.set(null)"
              aria-label="Close video player"
            >
              <svg viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="m18 6-12 12M6 6l12 12" />
              </svg>
              Close
            </button>
          </header>

          <div class="player-content">
            <app-video-player [lectureId]="p.id" />
          </div>

          @if (p.description) {
            <div class="player-description">
              <h3>About this lecture</h3>
              <p>{{ p.description }}</p>
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: [
    PAGE_STYLES,
    `
      :host {
        display: block;
        color: #0f172a;
        font-family: inherit;
      }

      .lectures-page {
        box-sizing: border-box;
        width: 100%;
        max-width: 1440px;
        margin: 0 auto;
        min-height: 100%;
        padding: 10px 4px 40px;
      }

      /* PAGE HEADER (Matched exactly with Profile Page Hero Style) */
      .page-head {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        overflow: hidden;
        margin-bottom: 28px;
        padding: 28px;
        border: 1px solid #1e293b;
        border-radius: 20px;
        background:
          radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.25), transparent 45%),
          linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
        color: #fff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      }

      .page-head .kicker {
        display: inline-block;
        margin-bottom: 6px;
        color: #93c5fd;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .14em;
      }

      .page-head h1 {
        margin: 0;
        color: #fff;
        font-size: clamp(24px, 2.8vw, 32px);
        font-weight: 700;
        letter-spacing: -.03em;
        line-height: 1.2;
      }

      .page-head p {
        margin: 6px 0 0;
        color: #cbd5e1;
        font-size: 13.5px;
        line-height: 1.6;
      }

      .lecture-total {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.06);
      }

      .total-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #fff;
      }

      .total-icon svg {
        width: 22px;
        height: 22px;
      }

      .total-copy strong,
      .total-copy small {
        display: block;
      }

      .total-copy strong {
        color: #fff;
        font-size: 20px;
        font-weight: 800;
      }

      .total-copy small {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 11px;
        white-space: nowrap;
      }

      /* LECTURE SECTION (Clean layout matching profile info section) */
      .lecture-section {
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }

      .section-head h2 {
        margin: 0;
        color: #0f172a;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -.02em;
      }

      .section-head p {
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

      .lec-card-wrapper {
        min-width: 0;
      }

      /* LECTURE CARDS (Matched with profile-card clean styling) */
      .lec-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 0;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        color: #0f172a;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
        transition: all 0.2s ease;
      }

      .lec-card:hover:not(.disabled) {
        transform: translateY(-3px);
        border-color: #cbd5e1;
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
      }

      .lec-card:focus-visible,
      .close-btn:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 3px;
      }

      .lec-card.disabled {
        cursor: default;
      }

      .lec-thumb {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: #0f172a;
      }

      .thumbnail-pattern {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background:
          radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.25), transparent 45%),
          linear-gradient(135deg, #0f172a, #1e1b4b);
      }

      .pattern-circle {
        position: absolute;
        display: block;
        border: 1px solid rgba(147, 197, 253, 0.08);
        border-radius: 50%;
      }

      .circle-one {
        top: -60px;
        right: -50px;
        width: 180px;
        height: 180px;
      }

      .circle-two {
        bottom: -70px;
        left: -40px;
        width: 130px;
        height: 130px;
      }

      .thumbnail-video-icon {
        width: 52px;
        height: 52px;
        color: rgba(147, 197, 253, 0.2);
      }

      .play-icon {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        background: #2563eb;
        color: #fff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .lec-card:hover:not(.disabled) .play-icon {
        transform: scale(1.08);
        background: #1d4ed8;
      }

      .play-icon svg {
        width: 22px;
        height: 22px;
        margin-left: 2px;
      }

      .thumbnail-label {
        position: absolute;
        bottom: 10px;
        left: 10px;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(4px);
        color: #bfdbfe;
        font-size: 9.5px;
        font-weight: 750;
        letter-spacing: .06em;
      }

      .duration-badge {
        position: absolute;
        right: 10px;
        bottom: 10px;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(4px);
        color: #f8fafc;
        font-size: 10px;
        font-weight: 700;
      }

      .duration-badge svg {
        width: 12px;
        height: 12px;
      }

      .status-badge {
        position: relative;
        z-index: 1;
        padding: 6px 12px;
        border: 1px solid #fde68a;
        border-radius: 8px;
        background: #fffbeb;
        color: #b45309;
        font-size: 10px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: .06em;
      }

      .status-badge[data-status='Failed'] {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #c2410c;
      }

      .lec-body {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 12px;
        padding: 18px;
      }

      .lec-label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .course-label {
        max-width: calc(100% - 20px);
        overflow: hidden;
        padding: 3px 8px;
        border-radius: 6px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 10px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .availability-dot {
        flex: 0 0 7px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #f59e0b;
      }

      .availability-dot.ready {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
      }

      .availability-dot.not-ready {
        background: #f59e0b;
      }

      .lec-body h3 {
        display: -webkit-box;
        margin: 0;
        overflow: hidden;
        color: #0f172a;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.45;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .lec-description {
        display: -webkit-box;
        margin: 0;
        overflow: hidden;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .muted-description {
        color: #94a3b8;
      }

      .lec-divider {
        height: 1px;
        margin-top: auto;
        background: #f1f5f9;
      }

      .lec-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-top: 4px;
      }

      .batch-info {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 6px;
        color: #64748b;
        font-size: 11px;
      }

      .batch-info svg {
        flex: 0 0 15px;
        width: 15px;
        height: 15px;
        color: #94a3b8;
      }

      .batch-info span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .watch-link {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        color: #2563eb;
        font-size: 11px;
        font-weight: 700;
      }

      .watch-link svg {
        width: 14px;
        height: 14px;
        transition: transform 0.2s ease;
      }

      .lec-card:hover:not(.disabled) .watch-link svg {
        transform: translateX(3px);
      }

      .pending-text {
        flex: 0 0 auto;
        color: #b45309;
        font-size: 10.5px;
        font-weight: 700;
      }

      .lec-warning {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 4px;
        padding: 10px;
        border: 1px solid #fde68a;
        border-radius: 8px;
        background: #fffbeb;
        color: #b45309;
        font-size: 11px;
        line-height: 1.5;
      }

      .lec-warning svg {
        flex: 0 0 14px;
        width: 14px;
        height: 14px;
      }

      /* Loading and Empty States */
      .state-card {
        display: flex;
        min-height: 260px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        text-align: center;
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
      }

      .state-card h2 {
        margin: 14px 0 0;
        color: #0f172a;
        font-size: 16px;
        font-weight: 700;
      }

      .state-card p {
        max-width: 420px;
        margin: 6px 0 0;
        color: #64748b;
        font-size: 12.5px;
        line-height: 1.6;
      }

      .spinner {
        display: block;
        width: 36px;
        height: 36px;
        border: 3px solid #e2e8f0;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: lecture-spin 0.8s linear infinite;
      }

      .empty-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border: 1px solid #bfdbfe;
        border-radius: 16px;
        background: #eff6ff;
        color: #2563eb;
      }

      .empty-icon svg {
        width: 28px;
        height: 28px;
      }

      @keyframes lecture-spin {
        to { transform: rotate(360deg); }
      }

      /* Video Player Modal */
      .player-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        overflow-y: auto;
        background: rgba(3, 7, 18, 0.88);
        backdrop-filter: blur(10px);
      }

      .player-modal {
        display: flex;
        width: 100%;
        max-width: 1100px;
        max-height: 92vh;
        flex-direction: column;
        gap: 20px;
        padding: 26px;
        overflow-y: auto;
        border: 1px solid #1e293b;
        border-radius: 20px;
        background: #090f1d;
        color: #e2e8f0;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
      }

      .player-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
      }

      .player-title-group {
        min-width: 0;
      }

      .player-eyebrow {
        display: block;
        margin-bottom: 6px;
        color: #60a5fa;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .14em;
      }

      .player-head h2 {
        margin: 0;
        color: #f8fafc;
        font-size: 20px;
        font-weight: 750;
        line-height: 1.4;
      }

      .player-head p {
        margin: 6px 0 0;
        color: #94a3b8;
        font-size: 12.5px;
        line-height: 1.5;
      }

      .close-btn {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        border: 1px solid #334155;
        border-radius: 10px;
        background: #1e293b;
        color: #e2e8f0;
        font-family: inherit;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .close-btn svg {
        width: 16px;
        height: 16px;
      }

      .close-btn:hover {
        border-color: #64748b;
        background: #334155;
      }

      .player-content {
        width: 100%;
        min-width: 0;
        overflow: hidden;
        border: 1px solid #1e293b;
        border-radius: 14px;
        background: #020617;
      }

      .player-description {
        padding: 16px;
        border: 1px solid #1e293b;
        border-radius: 12px;
        background: #0f172a;
      }

      .player-description h3 {
        margin: 0 0 6px;
        color: #f1f5f9;
        font-size: 13px;
        font-weight: 750;
      }

      .player-description p {
        margin: 0;
        color: #cbd5e1;
        font-size: 12.5px;
        line-height: 1.7;
        overflow-wrap: anywhere;
      }

      /* Responsive Adjustments */
      @media (max-width: 1100px) {
        .cards {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 768px) {
        .lectures-page {
          padding: 8px;
        }

        .page-head {
          flex-direction: column;
          align-items: stretch;
          gap: 18px;
          padding: 20px;
        }

        .cards {
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
        }

        .player-overlay {
          padding: 10px;
        }

        .player-modal {
          max-height: calc(100dvh - 20px);
          gap: 16px;
          padding: 16px;
          border-radius: 16px;
        }
      }
    `,
  ],
})
export class StudentLectures implements OnInit {
  private readonly lectureService = inject(LectureService);
  private readonly toast = inject(Toast);

  readonly lectures = signal<Lecture[]>([]);
  readonly loading = signal(true);
  readonly playing = signal<Lecture | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);

    try {
      this.lectures.set(await this.lectureService.getForMyBatches());
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message ||
          'Please try again in a moment.',
        'Unable to load lectures',
      );
    } finally {
      this.loading.set(false);
    }
  }

  openLecture(lecture: Lecture): void {
    if (this.canPlay(lecture)) {
      this.playing.set(lecture);
    }
  }

  duration(minutes: number): string {
    return formatDuration(minutes);
  }

  canPlay(lecture: Lecture): boolean {
    return lecture.processing_status === 'Ready';
  }

  getStatus(lecture: Lecture): string {
    const status = lecture.processing_status;

    if (status === 'Pending') return 'Pending';
    if (status === 'Uploading') return 'Uploading';
    if (status === 'Processing') return 'Processing';
    if (status === 'Failed') return 'Failed';

    return 'Not Ready';
  }

  getStatusMessage(lecture: Lecture): string {
    const status = lecture.processing_status;

    if (status === 'Pending') return 'Video upload is pending';
    if (status === 'Uploading') return 'Video is currently being uploaded';
    if (status === 'Processing') return 'Video is currently being processed';
    if (status === 'Failed') return 'Video processing failed';

    return 'Video is not ready yet';
  }
}