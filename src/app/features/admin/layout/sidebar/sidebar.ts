import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IconComponent,
  IconName,
} from '../../../../shared/components/icon/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        (click)="closed.emit()"
      ></div>
    }

    <aside
      class="admin-sidebar fixed inset-y-0 left-0 z-40
             flex h-dvh w-64 flex-col overflow-hidden
             border-r border-white/10 bg-[#020617] text-white
             transition-transform duration-200 ease-in-out
             lg:translate-x-0"
      [class.-translate-x-full]="!open()"
    >
      <!-- Fixed Brand Header -->
      <div
        class="flex h-16 min-h-16 shrink-0 items-center gap-3
               border-b border-white/10 px-5"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center
                 rounded-xl bg-[#1d4ed8] text-white
                 shadow-lg shadow-blue-900/30"
        >
          <app-icon name="graduation-cap" [size]="22" />
        </div>

        <div class="flex min-w-0 flex-col">
          <span class="text-lg font-extrabold tracking-tight text-white">
            EduCore
            <span class="font-medium text-blue-400">LMS</span>
          </span>

          <span
            class="text-[9px] font-bold uppercase tracking-[0.2em]
                   text-slate-400"
          >
            Admin Portal
          </span>
        </div>
      </div>

      <!-- Navigation Area -->
      <div class="sidebar-navigation min-h-0 flex-1">
        <!-- Navigation Label -->
        <div class="px-6 pb-2 pt-6">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.18em]
                   text-slate-500"
          >
            Main Menu
          </p>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-1 px-3 pb-4">
          @for (item of items; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              (click)="onNavigate()"
              class="nav-link flex items-center gap-3 rounded-xl
                     px-3.5 py-3 text-sm font-medium text-slate-400
                     transition-all duration-200
                     hover:bg-white/[0.06] hover:text-white"
            >
              <span
                class="nav-icon flex shrink-0 items-center justify-center"
              >
                <app-icon [name]="item.icon" [size]="19" />
              </span>

              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }

    .admin-sidebar {
      box-shadow: 8px 0 30px rgb(2 6 23 / 10%);
    }

    /*
     * Navigation can scroll when required, but its scrollbar
     * remains invisible. Header stays fixed.
     */
    .sidebar-navigation {
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      overscroll-behavior-y: contain;
    }

    .sidebar-navigation::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .nav-link {
      position: relative;
      text-decoration: none;
      outline: none;
    }

    .nav-icon {
      width: 22px;
      height: 22px;
      transition: transform 180ms ease;
    }

    .nav-link:hover .nav-icon {
      transform: translateX(2px);
    }

    .nav-link.active {
      background: #1d4ed8;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 6px 18px rgb(29 78 216 / 25%);
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 25%;
      height: 50%;
      width: 3px;
      border-radius: 0 4px 4px 0;
      background: #93c5fd;
    }

    .nav-link.active .nav-icon {
      color: #ffffff;
    }

    .nav-link:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: -2px;
    }

    @media (max-height: 650px) {
      .sidebar-navigation > div {
        padding-top: 12px;
      }

      .nav-link {
        padding-top: 9px;
        padding-bottom: 9px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .admin-sidebar,
      .nav-link,
      .nav-icon {
        transition: none;
      }
    }
  `,
})
export class SidebarComponent {
  open = input(false);
  closed = output<void>();

  items: NavItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Courses', path: '/admin/courses', icon: 'book-open' },
    { label: 'Batches', path: '/admin/batches', icon: 'package' },
    { label: 'Lectures', path: '/admin/lectures', icon: 'book-open' },
    { label: 'Live Classes', path: '/admin/live-classes', icon: 'megaphone' },
    { label: 'Quizzes', path: '/admin/quizzes', icon: 'circle-help' },
    {
      label: 'Assignments',
      path: '/admin/assignments',
      icon: 'clipboard-list',
    },
    { label: 'Results', path: '/admin/results', icon: 'chart-column' },
    {
      label: 'Announcements',
      path: '/admin/announcements',
      icon: 'megaphone',
    },
    {
      label: 'Students',
      path: '/admin/students',
      icon: 'graduation-cap',
    },
    { label: 'Settings', path: '/admin/settings', icon: 'settings' },
  ];

  onNavigate(): void {
    if (window.innerWidth < 1024) {
      this.closed.emit();
    }
  }
}