import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import Hls from 'hls.js';
import type { ErrorData } from 'hls.js';
import { LectureService } from '../../../core/services/lecture.service';

const POSITION_KEY = 'lms-lecture-position:';
const MAX_MEDIA_RECOVERIES = 3;
const HIDE_CONTROLS_AFTER_MS = 2800;

/**
 * Apna video player (YouTube ka koi logo nahi). Server se chhota token leta hai,
 * phir hls.js se video chalata hai. Dobara kholne par wahin se shuru hoti hai jahan chhodi thi.
 *
 * Controls: play/pause, seek bar, 10 sec aage/peeche, volume, speed, fullscreen.
 * Keyboard: Space/K, ←/→ (5s), J/L (10s), ↑/↓ (volume), M (mute), F (fullscreen).
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
      }

      .vp {
        position: relative;
        width: 100%;
        max-height: 72vh;
        aspect-ratio: 16 / 9;
        margin: 0 auto;
        overflow: hidden;
        border-radius: 10px;
        background: #000;
        color: #fff;
        font-family: inherit;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .vp:fullscreen,
      .vp.is-full {
        width: 100vw;
        height: 100vh;
        max-height: none;
        aspect-ratio: auto;
        border-radius: 0;
      }

      .vp.idle {
        cursor: none;
      }

      .vp-video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }

      /* Center play button */
      .vp-center {
        position: absolute;
        top: 50%;
        left: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 68px;
        height: 68px;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.92);
        color: #fff;
        cursor: pointer;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .vp-center:hover {
        transform: translate(-50%, -50%) scale(1.07);
        background: #1d4ed8;
      }

      .vp-center svg {
        width: 30px;
        height: 30px;
        margin-left: 3px;
      }

      /* Loading / buffering */
      .vp-loading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        pointer-events: none;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
      }

      .vp-spinner {
        width: 38px;
        height: 38px;
        border: 3px solid rgba(255, 255, 255, 0.25);
        border-top-color: #fff;
        border-radius: 50%;
        animation: vp-spin 0.8s linear infinite;
      }

      @keyframes vp-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Error */
      .vp-error {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        background: rgba(0, 0, 0, 0.88);
        text-align: center;
        font-size: 13.5px;
      }

      .vp-error p {
        margin: 0;
        max-width: 420px;
        line-height: 1.6;
      }

      .vp-retry {
        padding: 9px 18px;
        border: 0;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .vp-retry:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      /* Controls bar */
      .vp-controls {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        padding: 34px 14px 10px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.88), transparent);
        transition: opacity 0.2s ease;
      }

      .vp.idle .vp-controls {
        opacity: 0;
        pointer-events: none;
      }

      .vp-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 2px;
      }

      .vp-group {
        position: relative;
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .vp-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 6px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #fff;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .vp-btn:hover {
        background: rgba(255, 255, 255, 0.16);
      }

      .vp-btn svg {
        width: 22px;
        height: 22px;
      }

      .vp-time {
        margin-left: 8px;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        color: rgba(255, 255, 255, 0.9);
        white-space: nowrap;
      }

      /* Sliders */
      .vp-seek,
      .vp-vol {
        -webkit-appearance: none;
        appearance: none;
        margin: 0;
        height: 16px;
        background: transparent;
        cursor: pointer;
      }

      .vp-seek {
        display: block;
        width: 100%;
      }

      .vp-vol {
        width: 72px;
        margin-left: 2px;
      }

      .vp-seek::-webkit-slider-runnable-track {
        height: 5px;
        border-radius: 3px;
        background: linear-gradient(
          to right,
          #3b82f6 0 var(--p, 0%),
          rgba(255, 255, 255, 0.55) var(--p, 0%) var(--b, 0%),
          rgba(255, 255, 255, 0.2) var(--b, 0%) 100%
        );
      }

      .vp-seek::-moz-range-track {
        height: 5px;
        border-radius: 3px;
        background: linear-gradient(
          to right,
          #3b82f6 0 var(--p, 0%),
          rgba(255, 255, 255, 0.55) var(--p, 0%) var(--b, 0%),
          rgba(255, 255, 255, 0.2) var(--b, 0%) 100%
        );
      }

      .vp-vol::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 3px;
        background: linear-gradient(
          to right,
          #fff 0 var(--v, 100%),
          rgba(255, 255, 255, 0.3) var(--v, 100%) 100%
        );
      }

      .vp-vol::-moz-range-track {
        height: 4px;
        border-radius: 3px;
        background: linear-gradient(
          to right,
          #fff 0 var(--v, 100%),
          rgba(255, 255, 255, 0.3) var(--v, 100%) 100%
        );
      }

      .vp-seek::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 13px;
        height: 13px;
        margin-top: -4px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
      }

      .vp-seek::-moz-range-thumb {
        width: 13px;
        height: 13px;
        border: 0;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
      }

      .vp-vol::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 11px;
        height: 11px;
        margin-top: -3.5px;
        border-radius: 50%;
        background: #fff;
      }

      .vp-vol::-moz-range-thumb {
        width: 11px;
        height: 11px;
        border: 0;
        border-radius: 50%;
        background: #fff;
      }

      /* Speed menu */
      .vp-menu {
        position: absolute;
        right: 0;
        bottom: 44px;
        display: flex;
        flex-direction: column;
        min-width: 96px;
        padding: 6px;
        border: 1px solid #334155;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.97);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }

      .vp-menu button {
        padding: 7px 12px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #e2e8f0;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }

      .vp-menu button:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .vp-menu button.active {
        background: #2563eb;
        color: #fff;
      }

      @media (max-width: 560px) {
        .vp-vol,
        .vp-time {
          display: none;
        }

        .vp-controls {
          padding: 28px 8px 6px;
        }
      }
    `,
  ],
  template: `
    <div
      #wrap
      class="vp"
      tabindex="0"
      [class.idle]="playing() && !controlsVisible()"
      [class.is-full]="fullscreen()"
      (mousemove)="wake()"
      (touchstart)="wake()"
      (keydown)="onKey($event)"
    >
      <video
        #video
        class="vp-video"
        playsinline
        controlsList="nodownload"
        (contextmenu)="$event.preventDefault()"
        (click)="onVideoClick()"
        (dblclick)="toggleFullscreen()"
        (play)="onPlay()"
        (pause)="onPause()"
        (waiting)="buffering.set(true)"
        (playing)="buffering.set(false)"
        (canplay)="buffering.set(false)"
        (timeupdate)="syncTime()"
        (durationchange)="syncTime()"
        (progress)="syncBuffered()"
        (volumechange)="syncVolume()"
      ></video>

      @if ((loading() || buffering()) && !error()) {
        <div class="vp-loading">
          <span class="vp-spinner"></span>
          @if (loading()) {
            <span>Loading video…</span>
          }
        </div>
      }

      @if (!playing() && !loading() && !buffering() && !error()) {
        <button type="button" class="vp-center" (click)="togglePlay()" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
      }

      @if (error(); as message) {
        <div class="vp-error">
          <p>{{ message }}</p>
          <button type="button" class="vp-retry" (click)="retry()">Try again</button>
        </div>
      }

      @if (!error()) {
        <div class="vp-controls" (click)="$event.stopPropagation()">
          <input
            class="vp-seek"
            type="range"
            min="0"
            step="0.1"
            [max]="duration() || 1"
            [value]="currentTime()"
            [style.--p]="progressPct()"
            [style.--b]="bufferedPct()"
            (input)="onSeek($event)"
            (change)="focusPlayer()"
            aria-label="Seek"
          />

          <div class="vp-row">
            <div class="vp-group">
              <button type="button" class="vp-btn" (click)="togglePlay()"
                [attr.aria-label]="playing() ? 'Pause' : 'Play'">
                @if (playing()) {
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                }
              </button>

              <button type="button" class="vp-btn" (click)="seekBy(-10)" aria-label="Back 10 seconds">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                  <text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor"
                    stroke="none" font-weight="700">10</text>
                </svg>
              </button>

              <button type="button" class="vp-btn" (click)="seekBy(10)" aria-label="Forward 10 seconds">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <text x="12" y="15.5" font-size="7" text-anchor="middle" fill="currentColor"
                    stroke="none" font-weight="700">10</text>
                </svg>
              </button>

              <button type="button" class="vp-btn" (click)="toggleMute()"
                [attr.aria-label]="muted() ? 'Unmute' : 'Mute'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4z" />
                  @if (muted()) {
                    <path d="m22 9-6 6M16 9l6 6" />
                  } @else {
                    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
                  }
                </svg>
              </button>

              <input
                class="vp-vol"
                type="range"
                min="0"
                max="1"
                step="0.05"
                [value]="muted() ? 0 : volume()"
                [style.--v]="volumePct()"
                (input)="onVolume($event)"
                (change)="focusPlayer()"
                aria-label="Volume"
              />

              <span class="vp-time">{{ format(currentTime()) }} / {{ format(duration()) }}</span>
            </div>

            <div class="vp-group">
              <button type="button" class="vp-btn" (click)="toggleMenu()" aria-label="Playback speed">
                {{ rate() }}x
              </button>

              @if (menuOpen()) {
                <div class="vp-menu" role="menu">
                  @for (r of rates; track r) {
                    <button type="button" role="menuitemradio" [class.active]="r === rate()"
                      (click)="setRate(r)">
                      {{ r === 1 ? 'Normal' : r + 'x' }}
                    </button>
                  }
                </div>
              }

              <button type="button" class="vp-btn" (click)="toggleFullscreen()"
                [attr.aria-label]="fullscreen() ? 'Exit fullscreen' : 'Fullscreen'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  @if (fullscreen()) {
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                  } @else {
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) lectureId!: number;

  @ViewChild('video', { static: true }) private readonly videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('wrap', { static: true }) private readonly wrapRef!: ElementRef<HTMLDivElement>;

  private readonly lectureService = inject(LectureService);

  // Load / error state
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Player UI state
  readonly playing = signal(false);
  readonly buffering = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly bufferedEnd = signal(0);
  readonly volume = signal(1);
  readonly muted = signal(false);
  readonly rate = signal(1);
  readonly fullscreen = signal(false);
  readonly controlsVisible = signal(true);
  readonly menuOpen = signal(false);

  readonly rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  readonly progressPct = computed(() => this.toPct(this.currentTime(), this.duration()));
  readonly bufferedPct = computed(() => this.toPct(this.bufferedEnd(), this.duration()));
  readonly volumePct = computed(() => `${Math.round((this.muted() ? 0 : this.volume()) * 100)}%`);

  private hls?: Hls;
  private tokenRetried = false;
  private mediaRecoveries = 0;
  private lastSavedAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;

  private readonly onTimeUpdate = () => {
    const now = Date.now();
    if (now - this.lastSavedAt < 5000) return;

    this.lastSavedAt = now;
    this.savePosition();
  };

  private readonly onEnded = () => {
    this.storage('remove');
    this.playing.set(false);
    this.controlsVisible.set(true);
  };

  ngOnInit(): void {
    const video = this.videoRef.nativeElement;
    video.addEventListener('timeupdate', this.onTimeUpdate);
    video.addEventListener('ended', this.onEnded);

    // Keyboard shortcuts foran kaam karein
    queueMicrotask(() => this.focusPlayer());

    void this.start();
  }

  ngOnDestroy(): void {
    this.savePosition();

    if (this.hideTimer) clearTimeout(this.hideTimer);

    if (document.fullscreenElement === this.wrapRef.nativeElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    const video = this.videoRef.nativeElement;
    video.removeEventListener('timeupdate', this.onTimeUpdate);
    video.removeEventListener('ended', this.onEnded);

    this.destroyHls();
    video.removeAttribute('src');
    video.load();
  }

  retry(): void {
    this.tokenRetried = false;
    this.mediaRecoveries = 0;
    void this.start();
  }

  // ---------- Controls ----------

  focusPlayer(): void {
    this.wrapRef.nativeElement.focus({ preventScroll: true });
  }

  onVideoClick(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }

    this.togglePlay();
  }

  togglePlay(): void {
    const video = this.videoRef.nativeElement;

    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }

    this.focusPlayer();
  }

  seekBy(seconds: number): void {
    const video = this.videoRef.nativeElement;
    const max = Number.isFinite(video.duration) ? video.duration : 0;

    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), max);
    this.syncTime();
    this.focusPlayer();
  }

  onSeek(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.videoRef.nativeElement.currentTime = value;
    this.currentTime.set(value);
  }

  toggleMute(): void {
    const video = this.videoRef.nativeElement;

    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;

    this.focusPlayer();
  }

  onVolume(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const video = this.videoRef.nativeElement;

    video.volume = value;
    video.muted = value === 0;
  }

  private adjustVolume(delta: number): void {
    const video = this.videoRef.nativeElement;

    video.muted = false;
    video.volume = Math.min(Math.max(Math.round((video.volume + delta) * 100) / 100, 0), 1);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.wake();
  }

  setRate(rate: number): void {
    this.videoRef.nativeElement.playbackRate = rate;
    this.rate.set(rate);
    this.menuOpen.set(false);
    this.focusPlayer();
  }

  toggleFullscreen(): void {
    const wrap = this.wrapRef.nativeElement;
    const video = this.videoRef.nativeElement as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (wrap.requestFullscreen) {
      void wrap.requestFullscreen().catch(() => undefined);
    } else if (video.webkitEnterFullscreen) {
      // iPhone Safari
      video.webkitEnterFullscreen();
    }

    this.focusPlayer();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.fullscreen.set(document.fullscreenElement === this.wrapRef.nativeElement);
  }

  onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        this.togglePlay();
        break;
      case 'ArrowLeft':
        this.seekBy(-5);
        break;
      case 'ArrowRight':
        this.seekBy(5);
        break;
      case 'j':
      case 'J':
        this.seekBy(-10);
        break;
      case 'l':
      case 'L':
        this.seekBy(10);
        break;
      case 'ArrowUp':
        this.adjustVolume(0.1);
        break;
      case 'ArrowDown':
        this.adjustVolume(-0.1);
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.wake();
  }

  // ---------- Video events -> UI state ----------

  onPlay(): void {
    this.playing.set(true);
    this.wake();
  }

  onPause(): void {
    this.playing.set(false);
    this.controlsVisible.set(true);
  }

  syncTime(): void {
    const video = this.videoRef.nativeElement;

    this.currentTime.set(video.currentTime);
    this.duration.set(Number.isFinite(video.duration) ? video.duration : 0);
    this.syncBuffered();
  }

  syncBuffered(): void {
    const video = this.videoRef.nativeElement;
    const ranges = video.buffered;
    const time = video.currentTime;
    let end = 0;

    for (let i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= time + 0.5 && ranges.end(i) >= time) {
        end = ranges.end(i);
      }
    }

    this.bufferedEnd.set(end);
  }

  syncVolume(): void {
    const video = this.videoRef.nativeElement;

    this.volume.set(video.volume);
    this.muted.set(video.muted || video.volume === 0);
  }

  /** Controls dikhao, aur video chal rahi ho to thori der baad chhupa do. */
  wake(): void {
    this.controlsVisible.set(true);

    if (this.hideTimer) clearTimeout(this.hideTimer);

    if (this.playing() && !this.menuOpen()) {
      this.hideTimer = setTimeout(
        () => this.controlsVisible.set(false),
        HIDE_CONTROLS_AFTER_MS,
      );
    }
  }

  format(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';

    const s = Math.floor(totalSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');

    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  private toPct(value: number, total: number): string {
    if (!total || total <= 0) return '0%';

    return `${Math.min(Math.max((value / total) * 100, 0), 100)}%`;
  }

  // ---------- HLS loading ----------

  private async start(): Promise<void> {
    this.destroyHls();
    this.loading.set(true);
    this.error.set(null);

    try {
      const url = await this.lectureService.getPlaybackUrl(this.lectureId);
      const video = this.videoRef.nativeElement;

      video.addEventListener('loadedmetadata', () => this.restorePosition(), { once: true });

      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 60 });
        this.hls = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => this.loading.set(false));
        hls.on(Hls.Events.FRAG_LOADED, () => {
          this.tokenRetried = false;
        });
        hls.on(Hls.Events.ERROR, (_event, data) => this.onHlsError(data));

        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari / iPhone: apna HLS player
        video.src = url;
        this.loading.set(false);
      } else {
        this.fail('Your browser cannot play this video. Please use Chrome, Edge, Firefox or Safari.');
      }
    } catch (error) {
      this.fail((error as Error).message || 'Unable to load the video.');
    }
  }

  private onHlsError(data: ErrorData): void {
    if (!data.fatal) return;

    const code = data.response?.code;

    // Token expire ho gaya (bohat lambi baithak): naya token le kar wahin se dobara
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && (code === 401 || code === 403)) {
      if (!this.tokenRetried) {
        this.tokenRetried = true;
        this.savePosition();
        void this.start();
        return;
      }

      this.fail('You do not have access to this video, or your session has expired. Please sign in again.');
      return;
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && this.mediaRecoveries < MAX_MEDIA_RECOVERIES) {
      this.mediaRecoveries++;
      this.hls?.recoverMediaError();
      return;
    }

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      this.fail('The connection to the video server was lost. Check your internet connection and try again.');
      return;
    }

    this.fail('The video could not be played.');
  }

  private fail(message: string): void {
    this.destroyHls();
    this.loading.set(false);
    this.buffering.set(false);
    this.error.set(message);
  }

  private destroyHls(): void {
    this.hls?.destroy();
    this.hls = undefined;
  }

  // ---------- "Jahan chhoda wahin se" ----------

  private savePosition(): void {
    const video = this.videoRef.nativeElement;

    if (video.currentTime > 5 && Number.isFinite(video.duration)) {
      this.storage('set', String(Math.floor(video.currentTime)));
    }
  }

  private restorePosition(): void {
    const video = this.videoRef.nativeElement;
    const saved = Number(this.storage('get'));

    if (saved > 5 && saved < video.duration - 10) {
      video.currentTime = saved;
    }
  }

  /** localStorage kabhi band / khali ho sakta hai, isliye har jagah try/catch. */
  private storage(action: 'get' | 'set' | 'remove', value = ''): string | null {
    try {
      const key = POSITION_KEY + this.lectureId;

      if (action === 'set') localStorage.setItem(key, value);
      else if (action === 'remove') localStorage.removeItem(key);
      else return localStorage.getItem(key);
    } catch {
      // ignore
    }

    return null;
  }
}