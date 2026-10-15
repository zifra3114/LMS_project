
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Toast } from '../../../core/services/toast.service';
import {
  Row,
  STUDENT_TABLES,
  StudentDataService,
  pick,
} from './student-data.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  },
  {
    path: 'profile',
    label: 'My Profile',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  {
    path: 'announcements',
    label: 'Announcements',
    icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  },
  {
    path: 'lectures',
    label: 'Lectures',
    icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  },
  {
    path: 'live-classes',
    label: 'Live Classes',
    icon: 'M23 7l-7 5 7 5V7zM1 5h15v14H1z',
  },
  {
    path: 'quizzes',
    label: 'Quizzes',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
  {
    path: 'assignments',
    label: 'Assignments',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
  },
  {
    path: 'results',
    label: 'Results',
    icon: 'M4 19V5M4 19h17M8 15l4-4 3 3 5-7',
  },
];

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <div class="layout">
        <!-- Student Sidebar -->
        <aside class="sidebar" [class.open]="sidebarOpen()">
          <!-- Brand -->
          <div class="brand">
            <div class="brand-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
                <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5" />
                <path d="M21.5 9v6" />
              </svg>
            </div>

            <div class="brand-copy">
              <strong>EduCore <span>LMS</span></strong>
              <small>STUDENT PORTAL</small>
            </div>
          </div>

          <!-- Navigation heading -->
          <div class="nav-heading">MAIN MENU</div>

          <!-- Enrolled course -->
          <div class="course-card">
            <span class="cc-label">ENROLLED COURSE</span>

            <strong>
              {{ profile()?.courseName || 'No course assigned' }}
            </strong>

            @if (profile()?.batchName) {
              <small>Batch: {{ profile()?.batchName }}</small>
            }
          </div>

          <!-- Student navigation only -->
          <nav class="nav">
            @for (item of nav; track item.path) {
              <a
                [routerLink]="'/student/' + item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.path === 'dashboard' }"
                class="nav-link"
                (click)="closeSidebar()"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path [attr.d]="item.icon" />
                </svg>

                <span>{{ item.label }}</span>
              </a>
            }
          </nav>

          <!-- Logout -->
          <button
            type="button"
            class="nav-link logout-link"
            (click)="logout()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>

            <span>Logout</span>
          </button>
        </aside>

        <!-- Mobile overlay -->
        @if (sidebarOpen()) {
          <div class="scrim" (click)="closeSidebar()"></div>
        }

        <!-- Main content -->
        <main class="content">
          <button
            type="button"
            class="mobile-menu"
            (click)="toggleSidebar()"
            aria-label="Toggle student menu"
            [attr.aria-expanded]="sidebarOpen()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
      color: #0f172a;
    }

    * {
      box-sizing: border-box;
    }

    .shell {
      min-height: 100dvh;
      background: #f7f9fc;
    }

    .layout {
      display: flex;
      min-height: 100dvh;
    }

    /* Sidebar */
    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 40;
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: 254px;
      height: 100dvh;
      padding: 0 12px 16px;
      overflow: hidden;
      background: #020617;
      color: #fff;
      border-right: 1px solid rgb(255 255 255 / 10%);
      box-shadow: 8px 0 30px rgb(2 6 23 / 10%);
    }

    /* EduCore brand */
    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      flex: 0 0 68px;
      margin: 0 -12px;
      padding: 0 18px;
      border-bottom: 1px solid rgb(255 255 255 / 10%);
    }

    .brand-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      border-radius: 12px;
      background: #1d4ed8;
      color: #fff;
      box-shadow: 0 6px 16px rgb(29 78 216 / 25%);
    }

    .brand-icon svg {
      width: 23px;
      height: 23px;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .brand-copy strong {
      color: #fff;
      font-size: 17px;
      font-weight: 900;
      line-height: 1.2;
      letter-spacing: -.04em;
      white-space: nowrap;
    }

    .brand-copy strong span {
      color: #60a5fa;
    }

    .brand-copy small {
      color: #94a3b8;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .18em;
      white-space: nowrap;
    }

    /* Navigation heading */
    .nav-heading {
      flex: 0 0 auto;
      padding: 0 10px;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .18em;
    }

    /* Course information */
    .course-card {
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 12px;
      background: rgb(255 255 255 / 5%);
    }

    .cc-label {
      color: #93c5fd;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .12em;
    }

    .course-card strong {
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .course-card small {
      color: #94a3b8;
      font-size: 11px;
    }

    /* Navigation: scrollbar hidden */
    .nav {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 4px;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      overscroll-behavior-y: contain;
    }

    .nav::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .nav-link {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      flex: 0 0 auto;
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: #94a3b8;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background .18s ease, color .18s ease;
    }

    .nav-link svg {
      width: 19px;
      height: 19px;
      flex: 0 0 19px;
    }

    .nav-link:hover {
      background: rgb(255 255 255 / 6%);
      color: #fff;
    }

    .nav-link.active {
      background: #1d4ed8;
      color: #fff;
      font-weight: 800;
      box-shadow: 0 6px 18px rgb(29 78 216 / 25%);
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      top: 25%;
      left: -1px;
      width: 3px;
      height: 50%;
      border-radius: 0 4px 4px 0;
      background: #93c5fd;
    }

    .nav-link:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: -2px;
    }

    /* Logout stays at the bottom */
    .logout-link {
      flex: 0 0 auto;
      margin-top: auto;
      color: #fda4af;
    }

    .logout-link:hover {
      background: rgb(225 29 72 / 15%);
      color: #fecdd3;
    }

    /* Main page area */
    .content {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 100dvh;
      margin-left: 254px;
      padding: 28px clamp(16px, 3vw, 36px) 40px;
    }

    .mobile-menu {
      display: none;
    }

    .scrim {
      display: none;
    }

    /* Tablet and mobile */
    @media (max-width: 1023px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform .22s ease;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .content {
        margin-left: 0;
        padding: 16px;
      }

      .mobile-menu {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-bottom: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
        color: #020617;
        cursor: pointer;
      }

      .mobile-menu svg {
        width: 21px;
        height: 21px;
      }

      .scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 30;
        background: rgb(2 6 23 / 55%);
      }
    }

    @media (max-height: 650px) {
      .sidebar {
        gap: 10px;
      }

      .nav-link {
        padding-top: 9px;
        padding-bottom: 9px;
      }

      .course-card {
        padding: 9px 12px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sidebar,
      .nav-link {
        transition: none;
      }
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

  private readonly allNotices = signal<Row[]>([]);

  readonly notices = computed(() => this.allNotices().slice(0, 5));

  async ngOnInit(): Promise<void> {
    await this.data.load();

    try {
      this.allNotices.set(
        await this.data.list(STUDENT_TABLES.announcements),
      );
    } catch {
      this.allNotices.set([]);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  title(row: Row): string {
    return pick(row, ['title', 'name', 'subject']) || 'Announcement';
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.client.auth.signOut();
    } finally {
      this.data.reset();
      this.toast.success('You have been logged out.', 'Logged Out');
      await this.router.navigateByUrl('/student-login');
    }
  }
}
