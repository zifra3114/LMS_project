import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Toast } from '../../../core/services/toast.service';
import { Row, STUDENT_TABLES, StudentDataService, fmtDate, pick } from './student-data.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { path: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { path: 'profile', label: 'My Profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { path: 'announcements', label: 'Announcements', icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
  { path: 'lectures', label: 'Lectures', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { path: 'live-classes', label: 'Live Classes', icon: 'M23 7l-7 5 7 5V7zM1 5h15v14H1z' },
  { path: 'quizzes', label: 'Quizzes', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { path: 'assignments', label: 'Assignments', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8' },
  { path: 'results', label: 'Results', icon: 'M4 19V5M4 19h17M8 15l4-4 3 3 5-7' },
];

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" class="icon-btn menu-btn" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <a routerLink="/student/dashboard" class="brand">
            <span class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"/><path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5"/><path d="M21.5 9v6"/>
              </svg>
            </span>
            <span class="brand-copy"><strong>EduCore</strong><small>STUDENT PORTAL</small></span>
          </a>
        </div>

        <div class="topbar-right">
          <!-- Notifications -->
          <div class="menu-wrap">
            <button type="button" class="icon-btn" (click)="toggleMenu('bell')" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
              @if (recentCount() > 0) { <span class="badge">{{ recentCount() > 9 ? '9+' : recentCount() }}</span> }
            </button>
            @if (menu() === 'bell') {
              <div class="dropdown bell-menu">
                <div class="dd-head">Notifications</div>
                @if (notices().length === 0) {
                  <p class="dd-empty">No new announcements.</p>
                } @else {
                  @for (n of notices(); track $index) {
                    <a routerLink="/student/announcements" class="notice" (click)="menu.set('none')">
                      <strong>{{ title(n) }}</strong>
                      <small>{{ date(n) }}</small>
                    </a>
                  }
                }
                <a routerLink="/student/announcements" class="dd-foot" (click)="menu.set('none')">View all announcements</a>
              </div>
            }
          </div>

          <!-- User -->
          <div class="menu-wrap">
            <button type="button" class="user-btn" (click)="toggleMenu('user')">
              <span class="avatar">{{ initials() }}</span>
              <span class="user-name">{{ profile()?.fullName ?? 'Student' }}</span>
              <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            @if (menu() === 'user') {
              <div class="dropdown user-menu">
                <div class="dd-user">
                  <strong>{{ profile()?.fullName ?? 'Student' }}</strong>
                  <small>{{ profile()?.email }}</small>
                </div>
                <a routerLink="/student/profile" class="dd-item" (click)="menu.set('none')">My Profile</a>
                <button type="button" class="dd-item danger" (click)="logout()">Logout</button>
              </div>
            }
          </div>
        </div>
      </header>

      @if (menu() !== 'none') { <div class="click-away" (click)="menu.set('none')"></div> }

      <div class="body">
        <aside class="sidebar" [class.open]="sidebarOpen()">
          <div class="course-card">
            <span class="cc-label">ENROLLED COURSE</span>
            <strong>{{ profile()?.courseName || 'No course assigned' }}</strong>
            @if (profile()?.batchName) { <small>Batch: {{ profile()?.batchName }}</small> }
          </div>

          <nav class="nav">
            @for (item of nav; track item.path) {
              <a [routerLink]="'/student/' + item.path" routerLinkActive="active" class="nav-link" (click)="sidebarOpen.set(false)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="item.icon"/></svg>
                {{ item.label }}
              </a>
            }
          </nav>

          <button type="button" class="nav-link logout-link" (click)="logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Logout
          </button>
        </aside>

        @if (sidebarOpen()) { <div class="scrim" (click)="sidebarOpen.set(false)"></div> }

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; color: #0f172a; }
    * { box-sizing: border-box; }
    .shell { min-height: 100dvh; background: #f7f9fc; }

    .topbar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 68px; padding: 0 22px; background: rgba(255,255,255,.97); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(8px); }
    .topbar-left, .topbar-right { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .brand { display: inline-flex; align-items: center; gap: 11px; text-decoration: none; min-width: 0; }
    .brand-icon { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto; border-radius: 13px; background: #020617; color: #fff; box-shadow: 0 5px 14px #cbd5e1; }
    .brand-icon svg { width: 21px; height: 21px; }
    .brand-copy { display: flex; flex-direction: column; gap: 3px; }
    .brand-copy strong { font-size: 18px; line-height: 1; font-weight: 900; letter-spacing: -.04em; color: #020617; }
    .brand-copy small { font-size: 8px; font-weight: 800; letter-spacing: .19em; color: #1d4ed8; white-space: nowrap; }

    .icon-btn { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; color: #334155; cursor: pointer; transition: .2s ease; }
    .icon-btn:hover { background: #020617; border-color: #020617; color: #fff; }
    .icon-btn svg { width: 19px; height: 19px; }
    .menu-btn { display: none; }
    .badge { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #e11d48; color: #fff; font-size: 9px; font-weight: 900; border: 2px solid #fff; }

    .menu-wrap { position: relative; }
    .user-btn { display: inline-flex; align-items: center; gap: 9px; height: 42px; padding: 0 10px 0 5px; border: 1px solid #e2e8f0; border-radius: 13px; background: #fff; color: #0f172a; cursor: pointer; font-family: inherit; transition: border-color .2s ease; }
    .user-btn:hover { border-color: #93c5fd; }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #1d4ed8; color: #fff; font-size: 11px; font-weight: 900; }
    .user-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 800; }
    .chev { width: 15px; height: 15px; color: #64748b; }

    .click-away { position: fixed; inset: 0; z-index: 45; }
    .dropdown { position: absolute; z-index: 50; top: calc(100% + 10px); right: 0; width: 250px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 18px 40px rgb(15 23 42 / 14%); overflow: hidden; }
    .bell-menu { width: 300px; }
    .dd-head { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 900; }
    .dd-empty { margin: 0; padding: 22px 16px; text-align: center; color: #94a3b8; font-size: 12px; }
    .notice { display: flex; flex-direction: column; gap: 3px; padding: 11px 16px; border-bottom: 1px solid #f8fafc; text-decoration: none; color: #0f172a; }
    .notice:hover { background: #f8fafc; }
    .notice strong { font-size: 12px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notice small { color: #94a3b8; font-size: 10px; }
    .dd-foot { display: block; padding: 12px 16px; text-align: center; color: #1d4ed8; font-size: 11px; font-weight: 900; text-decoration: none; background: #f8fafc; }
    .dd-foot:hover { color: #020617; }
    .dd-user { display: flex; flex-direction: column; gap: 3px; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .dd-user strong { font-size: 13px; font-weight: 900; }
    .dd-user small { color: #94a3b8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; }
    .dd-item { display: block; width: 100%; padding: 12px 16px; border: 0; background: #fff; text-align: left; font-family: inherit; font-size: 12px; font-weight: 700; color: #334155; text-decoration: none; cursor: pointer; }
    .dd-item:hover { background: #f8fafc; color: #1d4ed8; }
    .dd-item.danger { color: #e11d48; }
    .dd-item.danger:hover { background: #fff1f2; color: #be123c; }

    .body { display: flex; align-items: flex-start; }
    .sidebar { position: sticky; top: 68px; display: flex; flex-direction: column; gap: 18px; flex: 0 0 258px; width: 258px; height: calc(100dvh - 68px); padding: 20px 16px; background: #020617; color: #fff; }
    .course-card { display: flex; flex-direction: column; gap: 6px; padding: 16px; border: 1px solid #ffffff1a; border-radius: 15px; background: #ffffff0f; }
    .cc-label { color: #93c5fd; font-size: 8.5px; font-weight: 900; letter-spacing: .18em; }
    .course-card strong { font-size: 14px; line-height: 1.35; font-weight: 900; }
    .course-card small { color: #94a3b8; font-size: 11px; }

    .nav { display: flex; flex-direction: column; gap: 4px; flex: 1 1 auto; overflow-y: auto; min-height: 0; }
    .nav-link { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 0; border-radius: 12px; background: transparent; color: #cbd5e1; font-family: inherit; font-size: 12.5px; font-weight: 700; text-align: left; text-decoration: none; cursor: pointer; transition: background .18s ease, color .18s ease; }
    .nav-link svg { width: 18px; height: 18px; flex: 0 0 auto; }
    .nav-link:hover { background: #ffffff12; color: #fff; }
    .nav-link.active { background: #1d4ed8; color: #fff; box-shadow: 0 8px 18px rgb(37 99 235 / 28%); }
    .logout-link { margin-top: auto; color: #fda4af; }
    .logout-link:hover { background: rgb(225 29 72 / 15%); color: #fecdd3; }

    .content { flex: 1 1 auto; min-width: 0; padding: 28px clamp(16px, 3vw, 36px) 40px; }
    .scrim { display: none; }

    button:focus-visible, a:focus-visible { outline: 3px solid rgb(37 99 235 / 35%); outline-offset: 2px; }

    @media (max-width: 1023px) {
      .menu-btn { display: grid; }
      .sidebar { position: fixed; top: 68px; left: 0; z-index: 35; height: calc(100dvh - 68px); transform: translateX(-100%); transition: transform .25s ease; }
      .sidebar.open { transform: translateX(0); }
      .scrim { display: block; position: fixed; inset: 68px 0 0 0; z-index: 30; background: rgb(2 6 23 / 45%); }
    }

    @media (max-width: 639px) {
      .topbar { padding: 0 12px; height: 62px; }
      .sidebar { top: 62px; height: calc(100dvh - 62px); }
      .scrim { inset: 62px 0 0 0; }
      .brand-copy small { display: none; }
      .user-name, .chev { display: none; }
      .user-btn { padding: 0 5px; }
      .bell-menu { position: fixed; top: 70px; left: 12px; right: 12px; width: auto; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
  `],
})
export class StudentLayoutComponent implements OnInit {
  private readonly data = inject(StudentDataService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  readonly nav = NAV;
  readonly profile = this.data.profile;
  readonly sidebarOpen = signal(false);
  readonly menu = signal<'none' | 'bell' | 'user'>('none');
  private readonly allNotices = signal<Row[]>([]);

  readonly notices = computed(() => this.allNotices().slice(0, 5));

  readonly recentCount = computed(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.allNotices().filter(n => {
      const time = new Date(pick(n, ['created_at', 'published_at', 'date'])).getTime();
      return !Number.isNaN(time) && time >= weekAgo;
    }).length;
  });

  readonly initials = computed(() => {
    const name = this.profile()?.fullName ?? 'S';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? 'S') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });

  async ngOnInit(): Promise<void> {
    await this.data.load();
    try {
      this.allNotices.set(await this.data.list(STUDENT_TABLES.announcements));
    } catch {
      this.allNotices.set([]);
    }
  }

  title(row: Row): string {
    return pick(row, ['title', 'name', 'subject']) || 'Announcement';
  }

  date(row: Row): string {
    return fmtDate(pick(row, ['created_at', 'published_at', 'date']));
  }

  toggleMenu(which: 'bell' | 'user'): void {
    this.menu.set(this.menu() === which ? 'none' : which);
  }

  async logout(): Promise<void> {
    this.menu.set('none');
    try {
      await this.supabase.client.auth.signOut();
    } finally {
      this.data.reset();
      this.toast.success('You have been logged out.', 'Logged Out');
      await this.router.navigateByUrl('/student-login');
    }
  }
}