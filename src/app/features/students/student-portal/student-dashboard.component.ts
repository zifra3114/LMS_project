import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { PAGE_STYLES } from './student-portal.styles';
import { Row, STUDENT_TABLES, StudentDataService, fmtDate, pick } from './student-data.service';

type TodoKind = 'quiz' | 'assignment' | 'live';

interface Todo {
  key: string;
  kind: TodoKind;
  title: string;
  dueRaw: string;
  dueText: string;
  note: string;
  urgent: boolean;
  path: string;
  link: string;
}

interface QuizStats {
  total: number;
  completed: number;
  incomplete: number;
  passed: number;
  failed: number;
}

interface AssignmentStats {
  total: number;
  submitted: number;
  pending: number;
  graded: number;
  overdue: number;
}

interface AttemptRow {
  quiz_id: number;
  score: number | null;
  passed: boolean | null;
  status: string | null;
  submitted_at: string | null;
}

interface SubmissionRow {
  assignment_id: number;
  marks_obtained: number | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;
const LIVE_TIME_KEYS = ['start_time', 'scheduled_at', 'start_date', 'class_date', 'date'];
const LIVE_LINK_KEYS = ['meeting_link', 'join_url', 'zoom_link', 'link', 'url'];

const EMPTY_QUIZ: QuizStats = { total: 0, completed: 0, incomplete: 0, passed: 0, failed: 0 };
const EMPTY_ASG: AssignmentStats = { total: 0, submitted: 0, pending: 0, graded: 0, overdue: 0 };

function isDraft(row: Row): boolean {
  return pick(row, ['status']).toLowerCase() === 'draft';
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function dueLabel(raw: string): { text: string; urgent: boolean } {
  const time = new Date(raw).getTime();
  if (!raw || Number.isNaN(time)) return { text: '', urgent: false };

  const diff = time - Date.now();
  if (diff < 0) return { text: `Overdue · ${fmtDate(raw)}`, urgent: true };

  const days = Math.floor(diff / DAY);
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  if (days <= 7) return { text: `Due in ${days} days`, urgent: days <= 2 };
  return { text: `Due ${fmtDate(raw)}`, urgent: false };
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Hero Banner -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="hero-copy">
        <div class="hello-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          WELCOME BACK, SCHOLAR
        </div>
        <h1>{{ profile()?.fullName ?? 'Student' }}</h1>
        <div class="hero-tags">
          <span class="htag">
            <small>Course</small>
            <strong>{{ profile()?.courseName || 'Not enrolled' }}</strong>
          </span>
          <span class="htag">
            <small>Batch</small>
            <strong>{{ profile()?.batchName || '—' }}</strong>
          </span>
          @if (profile()?.email) {
            <span class="htag hide-mobile">
              <small>Email</small>
              <strong>{{ profile()?.email }}</strong>
            </span>
          }
        </div>
      </div>
      <a routerLink="/student/profile" class="hero-btn">
        <span>View Profile</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </section>

    @if (loading()) {
      <div class="state-loading">
        <span class="spinner"></span>
        <p>Syncing your student portal dashboard...</p>
      </div>
    } @else {
      <!-- Overview Grid (Quizzes & Assignments) -->
      <section class="overview">
        <!-- Quizzes Overview Panel -->
        <article class="panel ov">
          <div class="ov-head">
            <div class="ov-title-group">
              <div class="ov-icon blue-grad">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div>
                <h2>Quizzes Performance</h2>
                <p>{{ quiz().completed }} of {{ quiz().total }} completed</p>
              </div>
            </div>
            <a routerLink="/student/quizzes" class="ov-link">Open Hub →</a>
          </div>

          <div class="bar"><span class="fill blue" [style.width.%]="quizPct()"></span></div>

          <div class="mini-grid">
            <div class="mini"><b>{{ quiz().total }}</b><span>Total</span></div>
            <div class="mini green"><b>{{ quiz().passed }}</b><span>Passed</span></div>
            <div class="mini red"><b>{{ quiz().failed }}</b><span>Failed</span></div>
            <div class="mini amber"><b>{{ quiz().incomplete }}</b><span>Pending</span></div>
          </div>
        </article>

        <!-- Assignments Overview Panel -->
        <article class="panel ov">
          <div class="ov-head">
            <div class="ov-title-group">
              <div class="ov-icon violet-grad">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <h2>Assignments Tracker</h2>
                <p>{{ asg().submitted }} of {{ asg().total }} submitted</p>
              </div>
            </div>
            <a routerLink="/student/assignments" class="ov-link">Open Hub →</a>
          </div>

          <div class="bar"><span class="fill violet" [style.width.%]="asgPct()"></span></div>

          <div class="mini-grid">
            <div class="mini"><b>{{ asg().total }}</b><span>Total</span></div>
            <div class="mini green"><b>{{ asg().graded }}</b><span>Graded</span></div>
            <div class="mini amber"><b>{{ asg().pending }}</b><span>Pending</span></div>
            <div class="mini red"><b>{{ asg().overdue }}</b><span>Overdue</span></div>
          </div>
        </article>
      </section>

      <!-- Quick Metrics Counters -->
      <section class="stats">
        @for (s of counts(); track s.label) {
          <a [routerLink]="s.path" class="stat">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="s.icon"/></svg>
            </span>
            <div class="stat-content">
              <b>{{ s.value }}</b>
              <span>{{ s.label }}</span>
            </div>
            <div class="stat-arrow">→</div>
          </a>
        }
      </section>

      <!-- Two-Column Section: To-Do & Announcements -->
      <section class="two-col">
        <!-- To-Do & Upcoming -->
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h2>To-Do &amp; Upcoming</h2>
            </div>
            @if (todos().length > 0) { <span class="pill-count">{{ todos().length }}</span> }
          </div>

          @if (todos().length === 0) {
            <div class="state-empty">
              <div class="empty-icon">🎉</div>
              <strong>You're completely caught up!</strong>
              <p>No pending quizzes, assignments, or upcoming classes right now.</p>
            </div>
          } @else {
            <ul class="todo">
              @for (t of todos(); track t.key) {
                <li [class.urgent]="t.urgent">
                  <span class="kind" [attr.data-kind]="t.kind">
                    {{ t.kind === 'quiz' ? 'Quiz' : t.kind === 'assignment' ? 'Task' : 'Live' }}
                  </span>
                  <div class="todo-body">
                    <strong>{{ t.title }}</strong>
                    <small>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {{ t.dueText }} @if (t.note) { &bull; {{ t.note }} }
                    </small>
                  </div>
                  @if (t.kind === 'live' && t.link) {
                    <a class="go join-btn" [href]="t.link" target="_blank" rel="noopener noreferrer">
                      <span>Join</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  } @else {
                    <a class="go" [routerLink]="t.path">Open</a>
                  }
                </li>
              }
            </ul>
          }
        </div>

        <!-- Announcements Panel -->
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <h2>Latest Announcements</h2>
            </div>
            <a routerLink="/student/announcements" class="ov-link">View all</a>
          </div>

          @if (latest().length === 0) {
            <div class="state-empty">
              <div class="empty-icon">📭</div>
              <strong>No announcements yet</strong>
              <p>Important updates from instructors will appear here.</p>
            </div>
          } @else {
            <ul class="news">
              @for (n of latest(); track $index) {
                <li>
                  <div class="news-top">
                    <strong>{{ pick(n, ['title', 'name', 'subject']) || 'Announcement' }}</strong>
                    <small>{{ fmt(pick(n, ['created_at', 'published_at', 'date'])) }}</small>
                  </div>
                  <p>{{ pick(n, ['message', 'description', 'content', 'body']) }}</p>
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: [PAGE_STYLES, `
    :host {
      display: block;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Hero Banner Styling */
    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 32px 36px;
      border-radius: 24px;
      background: linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%);
      color: #fff;
      position: relative;
      isolation: isolate;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .hero-glow {
      position: absolute;
      z-index: -1;
      top: -100px;
      right: -40px;
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0) 70%);
      border-radius: 50%;
      pointer-events: none;
    }
    .hello-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #93c5fd;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      margin-bottom: 6px;
    }
    .hello-badge svg { width: 14px; height: 14px; }
    .hero h1 {
      margin: 0 0 16px;
      font-size: clamp(24px, 3.5vw, 32px);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #f8fafc;
    }
    .hero-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .htag {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 9px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
      font-size: 13px;
    }
    .htag small {
      color: #93c5fd;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .htag strong {
      color: #f1f5f9;
      font-weight: 700;
    }
    .hero-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      padding: 13px 22px;
      border-radius: 14px;
      background: #2563eb;
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .hero-btn svg { width: 16px; height: 16px; transition: transform 0.2s ease; }
    .hero-btn:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6); }
    .hero-btn:hover svg { transform: translateX(3px); }

    /* Overview Section */
    .overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .ov-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .ov-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ov-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      color: #fff;
      flex: 0 0 auto;
    }
    .ov-icon.blue-grad { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .ov-icon.violet-grad { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); }
    .ov-icon svg { width: 22px; height: 22px; }
    .ov-head h2 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .ov-head p { margin: 3px 0 0; color: #64748b; font-size: 12px; font-weight: 600; }
    .ov-link { color: #2563eb; font-size: 12.5px; font-weight: 700; text-decoration: none; padding: 4px 8px; border-radius: 8px; transition: background 0.15s ease; }
    .ov-link:hover { background: #eff6ll; text-decoration: underline; }

    /* Progress bar */
    .bar { height: 10px; border-radius: 999px; background: #f1f5f9; overflow: hidden; margin-bottom: 18px; border: 1px solid #e2e8f0; }
    .fill { display: block; height: 100%; border-radius: 999px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
    .fill.blue { background: linear-gradient(90deg, #2563eb, #3b82f6); }
    .fill.violet { background: linear-gradient(90deg, #7c3aed, #a855f7); }

    /* Mini Grid Cards */
    .mini-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .mini { display: flex; flex-direction: column; gap: 2px; padding: 12px 8px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; text-align: center; transition: transform 0.15s ease; }
    .mini:hover { transform: translateY(-1px); }
    .mini b { font-size: 18px; font-weight: 800; line-height: 1.1; color: #0f172a; }
    .mini span { color: #64748b; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
    .mini.green { background: #f0fdf4; border-color: #bbf7d0; }
    .mini.green b { color: #15803d; }
    .mini.red { background: #fff1f2; border-color: #fecdd3; }
    .mini.red b { color: #be123c; }
    .mini.amber { background: #fffbeb; border-color: #fde68a; }
    .mini.amber b { color: #b45309; }

    /* Quick Metrics Stats Section */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #fff;
      text-decoration: none;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .stat:hover { border-color: #93c5fd; transform: translateY(-2px); box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.1); }
    .stat-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: #eff6ff; color: #2563eb; flex: 0 0 auto; transition: background 0.2s ease, color 0.2s ease; }
    .stat:hover .stat-icon { background: #2563eb; color: #fff; }
    .stat-icon svg { width: 22px; height: 22px; }
    .stat-content { flex: 1; min-width: 0; }
    .stat b { display: block; font-size: 22px; line-height: 1.1; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
    .stat span { color: #64748b; font-size: 12px; font-weight: 700; }
    .stat-arrow { color: #cbd5e1; font-weight: 700; transition: transform 0.2s ease; }
    .stat:hover .stat-arrow { color: #2563eb; transform: translateX(3px); }

    /* Two Column Layout */
    .two-col {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .panel-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #0f172a;
    }
    .panel-title-wrap svg { width: 20px; height: 20px; color: #2563eb; }
    .panel-head h2 { margin: 0; font-size: 17px; font-weight: 800; }
    .pill-count {
      padding: 3px 10px;
      border-radius: 999px;
      background: #0f172a;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
    }

    /* To-Do List Styles */
    .todo { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .todo li {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .todo li:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03); }
    .todo li.urgent { border-color: #fecdd3; background: #fff5f5; }
    .kind {
      flex: 0 0 auto;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: #eff6ff;
      color: #1d4ed8;
    }
    .kind[data-kind='assignment'] { background: #f5f3ff; color: #6d28d9; }
    .kind[data-kind='live'] { background: #ecfeff; color: #0e7490; }
    .todo-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .todo-body strong { font-size: 13.5px; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
    .todo-body small { display: flex; align-items: center; gap: 4px; color: #64748b; font-size: 11.5px; font-weight: 600; }
    .todo li.urgent .todo-body small { color: #be123c; }
    .go {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex: 0 0 auto;
      padding: 8px 14px;
      border-radius: 10px;
      background: #0f172a;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .go:hover { background: #2563eb; }
    .go.join-btn { background: #0e7490; }
    .go.join-btn:hover { background: #0891b2; }

    /* Announcements News List Styles */
    .news { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .news li { padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
    .news li:first-child { padding-top: 0; }
    .news li:last-child { border-bottom: 0; padding-bottom: 0; }
    .news-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
    .news strong { font-size: 13.5px; font-weight: 700; color: #0f172a; }
    .news p {
      margin: 0 0 6px;
      color: #475569;
      font-size: 12.5px;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news small { color: #94a3b8; font-size: 11px; font-weight: 700; }

    /* Empty and Loading States */
    .state-loading, .state-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 50px 20px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      margin-bottom: 24px;
      color: #64748b;
      gap: 12px;
    }
    .state-loading .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { font-size: 36px; margin-bottom: 2px; }
    .state-empty strong { color: #0f172a; font-size: 16px; font-weight: 800; }
    .state-empty p { margin: 0; font-size: 13px; max-width: 320px; }

    /* Responsive Queries */
    @media (max-width: 900px) {
      .two-col { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 639px) {
      .hero { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
      .hide-mobile { display: none; }
      .mini-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `],
})
export class StudentDashboardComponent implements OnInit {
  private readonly data = inject(StudentDataService);
  private readonly supabase = inject(SupabaseService);

  readonly profile = this.data.profile;
  readonly loading = signal(true);

  readonly quiz = signal<QuizStats>(EMPTY_QUIZ);
  readonly asg = signal<AssignmentStats>(EMPTY_ASG);
  readonly todos = signal<Todo[]>([]);
  readonly latest = signal<Row[]>([]);
  readonly counts = signal<{ label: string; value: number; path: string; icon: string }[]>([]);

  readonly quizPct = computed(() => pct(this.quiz().completed, this.quiz().total));
  readonly asgPct = computed(() => pct(this.asg().submitted, this.asg().total));

  readonly pick = pick;
  readonly fmt = fmtDate;

  async ngOnInit(): Promise<void> {
    try {
      const profile = await this.data.load();

      const ids = profile
        ? Array.from(new Set([profile.userId, profile.id].filter((v): v is string => !!v && UUID.test(v))))
        : [];

      const [quizzes, assignments, live, lectures, announcements] = await Promise.all([
        this.safe(() => this.loadContent(STUDENT_TABLES.quizzes, 'quiz_student_assignments', 'quiz_id', ids)),
        this.safe(() => this.loadContent(STUDENT_TABLES.assignments, 'assignment_student_assignments', 'assignment_id', ids)),
        this.safe(() => this.data.list(STUDENT_TABLES.liveClasses)),
        this.safe(() => this.data.list(STUDENT_TABLES.lectures)),
        this.safe(() => this.data.list(STUDENT_TABLES.announcements)),
      ]);

      const [attempts, submissions] = await Promise.all([
        this.safe(() => this.loadAttempts(ids)),
        this.safe(() => this.loadSubmissions(ids)),
      ]);

      const todos: Todo[] = [];
      this.buildQuizStats(quizzes, attempts, todos);
      this.buildAssignmentStats(assignments, submissions, todos);
      this.buildLive(live, todos);

      todos.sort((a, b) => this.sortKey(a).localeCompare(this.sortKey(b)));
      this.todos.set(todos.slice(0, 8));

      this.latest.set(announcements.slice(0, 4));
      this.counts.set([
        { label: 'Lectures', value: lectures.length, path: '/student/lectures', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
        { label: 'Live Classes', value: live.length, path: '/student/live-classes', icon: 'M23 7l-7 5 7 5V7zM1 5h15v14H1z' },
        { label: 'Announcements', value: announcements.length, path: '/student/announcements', icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
        { label: 'Results', value: this.quiz().completed + this.asg().graded, path: '/student/results', icon: 'M4 19V5M4 19h17M8 15l4-4 3 3 5-7' },
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  private async safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
    try {
      return await fn();
    } catch (e) {
      console.error('[StudentDashboard]', e);
      return [];
    }
  }

  private async loadContent(
    table: string,
    assignTable: string,
    fk: string,
    studentIds: string[],
  ): Promise<Row[]> {
    const base = await this.data.list(table);
    const map = new Map<string, Row>(base.map((r) => [pick(r, ['id']), r]));

    if (studentIds.length > 0) {
      const { data } = await this.supabase.client
        .from(assignTable)
        .select(fk)
        .in('student_id', studentIds);

      const wanted = ((data ?? []) as unknown as Row[])
        .map((r) => pick(r, [fk]))
        .filter((id) => id && !map.has(id));

      if (wanted.length > 0) {
        const { data: extra } = await this.supabase.client.from(table).select('*').in('id', wanted);
        for (const r of (extra ?? []) as Row[]) map.set(pick(r, ['id']), r);
      }
    }

    return Array.from(map.values()).filter((r) => !isDraft(r));
  }

  private async loadAttempts(studentIds: string[]): Promise<AttemptRow[]> {
    if (studentIds.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('quiz_attempts')
      .select('quiz_id, score, passed, status, submitted_at')
      .in('student_id', studentIds);

    if (error) throw new Error(error.message);

    return ((data ?? []) as AttemptRow[]).filter(
      (a) => a.status !== 'in_progress' || !!a.submitted_at,
    );
  }

  private async loadSubmissions(studentIds: string[]): Promise<SubmissionRow[]> {
    if (studentIds.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('assignment_submissions')
      .select('assignment_id, marks_obtained')
      .in('student_id', studentIds);

    if (error) throw new Error(error.message);
    return (data ?? []) as SubmissionRow[];
  }

  private buildQuizStats(quizzes: Row[], attempts: AttemptRow[], todos: Todo[]): void {
    const byQuiz = new Map<string, AttemptRow[]>();
    for (const a of attempts) {
      const key = String(a.quiz_id);
      byQuiz.set(key, [...(byQuiz.get(key) ?? []), a]);
    }

    let completed = 0;
    let passed = 0;
    let failed = 0;

    for (const q of quizzes) {
      const id = pick(q, ['id']);
      const tries = byQuiz.get(id);

      if (!tries || tries.length === 0) {
        const deadline = pick(q, ['deadline']);
        const due = dueLabel(deadline);
        const duration = pick(q, ['duration_minutes']);

        todos.push({
          key: `quiz-${id}`,
          kind: 'quiz',
          title: pick(q, ['title']) || 'Quiz',
          dueRaw: deadline,
          dueText: due.text || 'No deadline',
          note: duration ? `${duration} min` : '',
          urgent: due.urgent,
          path: '/student/quizzes',
          link: '',
        });
        continue;
      }

      completed++;

      const passingMarks = Number(pick(q, ['passing_marks']));
      const best = tries.reduce((x, y) => ((y.score ?? 0) > (x.score ?? 0) ? y : x));
      let ok = tries.some((t) => t.passed === true);

      if (!ok && tries.every((t) => t.passed === null) && !Number.isNaN(passingMarks)) {
        ok = (best.score ?? 0) >= passingMarks;
      }

      if (ok) passed++;
      else failed++;
    }

    this.quiz.set({
      total: quizzes.length,
      completed,
      incomplete: quizzes.length - completed,
      passed,
      failed,
    });
  }

  private buildAssignmentStats(
    assignments: Row[],
    submissions: SubmissionRow[],
    todos: Todo[],
  ): void {
    const submitted = new Map<string, SubmissionRow>();
    for (const s of submissions) {
      const key = String(s.assignment_id);
      const existing = submitted.get(key);
      if (!existing || (existing.marks_obtained === null && s.marks_obtained !== null)) {
        submitted.set(key, s);
      }
    }

    let submittedCount = 0;
    let graded = 0;
    let overdue = 0;

    for (const a of assignments) {
      const id = pick(a, ['id']);
      const sub = submitted.get(id);

      if (sub) {
        submittedCount++;
        if (sub.marks_obtained !== null && sub.marks_obtained !== undefined) graded++;
        continue;
      }

      const deadline = pick(a, ['deadline']);
      const due = dueLabel(deadline);
      const isOverdue = !!deadline && new Date(deadline).getTime() < Date.now();
      if (isOverdue) overdue++;

      const marks = pick(a, ['total_marks']);

      todos.push({
        key: `asg-${id}`,
        kind: 'assignment',
        title: pick(a, ['title']) || 'Assignment',
        dueRaw: deadline,
        dueText: due.text || 'No deadline',
        note: marks ? `${marks} marks` : '',
        urgent: due.urgent,
        path: '/student/assignments',
        link: '',
      });
    }

    this.asg.set({
      total: assignments.length,
      submitted: submittedCount,
      pending: assignments.length - submittedCount,
      graded,
      overdue,
    });
  }

  private buildLive(live: Row[], todos: Todo[]): void {
    const now = Date.now();

    live.forEach((row, i) => {
      const raw = pick(row, LIVE_TIME_KEYS);
      const time = new Date(raw).getTime();
      if (!raw || Number.isNaN(time) || time < now - 3.6e6) return;

      const days = Math.floor((time - now) / DAY);
      const when = new Date(time).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      todos.push({
        key: `live-${pick(row, ['id']) || i}`,
        kind: 'live',
        title: pick(row, ['title', 'name', 'topic', 'subject']) || 'Live class',
        dueRaw: raw,
        dueText: when,
        note: '',
        urgent: days <= 0,
        path: '/student/live-classes',
        link: pick(row, LIVE_LINK_KEYS),
      });
    });
  }

  private sortKey(t: Todo): string {
    const time = new Date(t.dueRaw).getTime();
    return Number.isNaN(time) ? '9999999999999' : String(time).padStart(13, '0');
  }
}