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
    <div class="page-head">
      <span class="kicker">My Learning</span>
      <h1>Recorded Lectures</h1>
      <p>Recorded lectures for your batch appear here.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading lectures...</div>
    } @else if (lectures().length === 0) {
      <div class="state">
        <strong>No lectures yet</strong>
        No lectures have been published for your batch yet.
      </div>
    } @else {
      <div class="cards">
        @for (l of lectures(); track l.id) {
          <div class="lec-card-wrapper">
            <button
              type="button"
              (click)="canPlay(l) ? playing.set(l) : null"
              class="lec-card"
              [class.disabled]="!canPlay(l)"
            >
              <div class="lec-thumb">
                @if (canPlay(l)) {
                  <span class="play-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                } @else {
                  <span class="status-badge">{{ getStatus(l) }}</span>
                }
              </div>
              <div class="lec-body">
                <h3>{{ l.title }}</h3>
                <p class="lec-meta">
                  {{ l.course_batches?.courses?.title }} · {{ l.course_batches?.batch_name }}
                </p>
                @if (l.duration_minutes && canPlay(l)) {
                  <p class="lec-duration">{{ duration(l.duration_minutes) }}</p>
                }
                @if (!canPlay(l)) {
                  <p class="lec-warning">{{ getStatusMessage(l) }}</p>
                }
              </div>
            </button>
          </div>
        }
      </div>
    }

    <!-- Player -->
    @if (playing(); as p) {
      <div class="player-overlay" (click)="playing.set(null)">
        <div class="player-modal" (click)="$event.stopPropagation()">
          <div class="player-head">
            <div>
              <h2>{{ p.title }}</h2>
              <p>{{ p.course_batches?.courses?.title }} · {{ p.course_batches?.batch_name }}</p>
            </div>
            <button type="button" (click)="playing.set(null)" class="close-btn">Close</button>
          </div>

          <app-video-player [lectureId]="p.id" />

          @if (p.description) {
            <p class="player-desc">{{ p.description }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: [PAGE_STYLES, `
    .lec-card-wrapper { display: contents; }
    .lec-card { display: flex; flex-direction: column; width: 100%; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; padding: 0; overflow: hidden; cursor: pointer; text-align: left; font-family: inherit; box-shadow: 0 2px 4px rgb(15 23 42 / 4%); transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, opacity .18s ease; }
    .lec-card:hover:not(.disabled) { border-color: #93c5fd; box-shadow: 0 10px 24px rgb(15 23 42 / 8%); transform: translateY(-1px); }
    .lec-card.disabled { opacity: 0.65; cursor: not-allowed; }
    .lec-thumb { position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: 16/9; background: linear-gradient(135deg, #020617 0%, #1e293b 100%); }
    .play-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, .95); color: #020617; }
    .play-icon svg { width: 24px; height: 24px; margin-left: 2px; }
    .status-badge { padding: 8px 16px; border-radius: 8px; background: rgba(251, 191, 36, 0.2); color: #f59e0b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .lec-body { display: flex; flex-direction: column; gap: 6px; padding: 16px; }
    .lec-body h3 { margin: 0; font-size: 13.5px; line-height: 1.45; font-weight: 900; color: #020617; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .lec-meta { margin: 0; color: #64748b; font-size: 11px; line-height: 1.5; }
    .lec-duration { margin: 0; color: #94a3b8; font-size: 10.5px; font-weight: 700; }
    .lec-warning { margin: 0; color: #f59e0b; font-size: 10.5px; font-weight: 700; }

    .player-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .75); padding: 16px; }
    .player-modal { width: 100%; max-width: 960px; display: flex; flex-direction: column; gap: 16px; border-radius: 20px; background: #fff; padding: 20px; box-shadow: 0 20px 60px rgb(0 0 0 / 40%); max-height: 90vh; overflow-y: auto; }
    .player-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .player-head h2 { margin: 0 0 4px; font-size: 17px; font-weight: 900; color: #020617; }
    .player-head p { margin: 0; color: #64748b; font-size: 11.5px; }
    .close-btn { flex: 0 0 auto; padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #334155; font-size: 11px; font-weight: 800; font-family: inherit; cursor: pointer; transition: background .2s ease, border-color .2s ease; }
    .close-btn:hover { background: #020617; border-color: #020617; color: #fff; }
    .player-desc { margin: 0; color: #64748b; font-size: 12.5px; line-height: 1.7; }

    @media (max-width: 639px) {
      .player-modal { padding: 16px; border-radius: 16px; }
      .player-head { flex-direction: column; gap: 12px; }
      .close-btn { width: 100%; }
    }
  `],
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
        (e as { message?: string })?.message || 'Please try again in a moment.',
        'Unable to load lectures',
      );
    } finally {
      this.loading.set(false);
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
    if (status === 'Pending') return 'Video upload pending';
    if (status === 'Uploading') return 'Video is being uploaded';
    if (status === 'Processing') return 'Video is being processed';
    if (status === 'Failed') return 'Video processing failed';
    return 'Video is not ready yet';
  }
}