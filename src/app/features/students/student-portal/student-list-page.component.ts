import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PAGE_STYLES } from './student-portal.styles';
import { Row, StudentDataService, fmtDate, pick } from './student-data.service';

interface ViewItem {
  title: string;
  body: string;
  date: string;
  ago: string;
  isNew: boolean;
  tag: string;
  important: boolean;
  chips: { label: string; value: string }[];
  link: string;
}

const TITLE_KEYS = ['title', 'name', 'quiz_title', 'assignment_title', 'lecture_title', 'topic', 'subject'];
const BODY_KEYS = ['description', 'message', 'content', 'body', 'instructions', 'details'];
const DATE_KEYS = ['created_at', 'published_at', 'date'];
const LINK_KEYS = ['meeting_link', 'join_url', 'zoom_link', 'video_url', 'link', 'url'];

const CHIPS: { label: string; keys: string[]; date?: boolean }[] = [
  { label: 'Score', keys: ['score', 'obtained_marks', 'marks_obtained'] },
  { label: 'Total Marks', keys: ['total_marks', 'max_marks', 'marks'] },
  { label: 'Percentage', keys: ['percentage'] },
  { label: 'Status', keys: ['status'] },
  { label: 'Duration', keys: ['duration', 'duration_minutes'] },
  { label: 'Due', keys: ['due_date', 'deadline'], date: true },
  { label: 'Starts', keys: ['start_time', 'scheduled_at', 'start_date', 'class_date'], date: true },
];

const TAG_LABELS: Record<string, string> = {
  manual: 'General',
  course: 'Course',
  quiz: 'Quiz',
  assignment: 'Assignment',
};

function relativeTime(raw: string): { ago: string; isNew: boolean } {
  const time = new Date(raw).getTime();
  if (!raw || Number.isNaN(time)) return { ago: '', isNew: false };

  const days = Math.floor((Date.now() - time) / 86_400_000);

  if (days <= 0) return { ago: 'Today', isNew: true };
  if (days === 1) return { ago: 'Yesterday', isNew: true };
  if (days < 7) return { ago: `${days} days ago`, isNew: days <= 3 };
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return { ago: `${weeks} week${weeks > 1 ? 's' : ''} ago`, isNew: false };
  }
  return { ago: '', isNew: false };
}

/**
 * Ek hi page jo announcements, lectures, live classes, quizzes,
 * assignments aur results sab dikhata hai. Route ke `data` se pata chalta hai
 * ke kaunsa table aur kaunsa title dikhana hai.
 */
@Component({
  selector: 'app-student-list-page',
  standalone: true,
  template: `
    <div class="page-head">
      <span class="kicker">{{ kicker }}</span>
      <div class="head-row">
        <h1>{{ heading }}</h1>
        @if (!loading() && !error() && items().length > 0) {
          <span class="count">{{ items().length }} {{ items().length === 1 ? 'item' : 'items' }}</span>
        }
      </div>
      <p>{{ subtitle }}</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading...</div>
    } @else if (error()) {
      <div class="state error">
        <strong>Could not load {{ heading.toLowerCase() }}</strong>
        {{ error() }}
      </div>
    } @else if (items().length === 0) {
      <div class="state">
        <div class="empty-icon">
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
        <strong>Nothing here yet</strong>{{ emptyText }}
      </div>
    } @else {
      <div class="cards">
        @for (item of items(); track $index) {
          <article class="item" [class.is-important]="item.important">
            <div class="item-top">
              <div class="item-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </div>

              <div class="badges">
                @if (item.isNew) { <span class="badge new">New</span> }
                @if (item.important) { <span class="badge important">Important</span> }
                @if (item.tag) { <span class="badge tag">{{ item.tag }}</span> }
              </div>
            </div>

            <h3>{{ item.title }}</h3>
            @if (item.body) { <p class="body">{{ item.body }}</p> }

            @if (item.chips.length > 0) {
              <div class="chips">
                @for (c of item.chips; track c.label) {
                  <span class="chip"><b>{{ c.label }}</b> {{ c.value }}</span>
                }
              </div>
            }

            @if (item.link) {
              <a class="open-btn" [href]="item.link" target="_blank" rel="noopener noreferrer">Open →</a>
            }

            @if (item.date) {
              <div class="item-foot">
                <span class="foot-date">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  {{ item.date }}
                </span>
                @if (item.ago) { <span class="foot-ago">{{ item.ago }}</span> }
              </div>
            }
          </article>
        }
      </div>
    }
  `,
  styles: [PAGE_STYLES],
})
export class StudentListPageComponent implements OnInit {
  private readonly data = inject(StudentDataService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<ViewItem[]>([]);

  heading = '';
  kicker = '';
  subtitle = '';
  emptyText = '';

  async ngOnInit(): Promise<void> {
    const cfg = this.route.snapshot.data as {
      heading: string;
      kicker?: string;
      subtitle?: string;
      empty?: string;
      table: string;
      own?: boolean;
    };

    this.heading = cfg.heading;
    this.kicker = cfg.kicker ?? 'My Learning';
    this.subtitle = cfg.subtitle ?? '';
    this.emptyText = cfg.empty ?? 'Check back later.';

    try {
      await this.data.load();
      const rows = await this.data.list(cfg.table, { own: cfg.own });
      this.items.set(rows.map((row) => this.toView(row, cfg.heading)));
    } catch (e) {
      this.error.set(
        `${e instanceof Error ? e.message : 'Unknown error'}. Table name ya access policy check karein (student-data.service.ts).`,
      );
    } finally {
      this.loading.set(false);
    }
  }

  private toView(row: Row, fallbackTitle: string): ViewItem {
    const chips: { label: string; value: string }[] = [];
    for (const chip of CHIPS) {
      const raw = pick(row, chip.keys);
      if (raw) {
        chips.push({ label: chip.label, value: chip.date ? fmtDate(raw) : raw });
      }
    }

    const rawDate = pick(row, DATE_KEYS);
    const { ago, isNew } = relativeTime(rawDate);
    const rawType = pick(row, ['type']).toLowerCase();

    return {
      title: pick(row, TITLE_KEYS) || fallbackTitle,
      body: pick(row, BODY_KEYS),
      date: fmtDate(rawDate),
      ago,
      isNew,
      tag: TAG_LABELS[rawType] ?? '',
      important: pick(row, ['priority']).toLowerCase() === 'important',
      chips,
      link: pick(row, LINK_KEYS),
    };
  }
}