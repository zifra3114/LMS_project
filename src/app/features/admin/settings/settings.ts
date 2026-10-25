import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InvitationService } from '../../../core/services/invitation.service';
import type { InvitationRole } from '../../../core/services/invitation.service';
import { Toast } from '../../../core/services/toast.service';

type UserRole = 'Teacher' | 'Student';

interface InviteForm {
  fullName: string;
  email: string;
  role: UserRole;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-[1400px] space-y-6">

        <!-- Header -->
        <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
              <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3" />
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.9 1.1l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.9-1.1l-1.7.7-1.5-2.6 1.4-1.1A7 7 0 0 1 6.5 12l-1.4-1.1 1.5-2.6 1.7.7a8 8 0 0 1 1.9-1.1l.3-1.8h3l.3 1.8a8 8 0 0 1 1.9 1.1l1.7-.7 1.5 2.6-1.4 1.1a7 7 0 0 1-.1 3Z"
                  transform="translate(0 -1)" />
              </svg>
            </div>

            <div>
              <span class="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Admin Panel
              </span>
              <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Settings
              </h1>
              <p class="mt-1 text-sm text-slate-500">
                Manage user access, invitations and account security.
              </p>
            </div>
          </div>

          <span class="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <span class="h-2 w-2 rounded-full bg-amber-500"></span>
            Invitation Setup
          </span>
        </header>

        <!-- Introduction -->
        <section class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-6 text-white sm:p-8">
          <div class="relative z-10 max-w-2xl">
            <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6" />
              </svg>
              User Access Management
            </span>

            <h2 class="mt-4 text-2xl font-bold sm:text-3xl">
              Manage your LMS accounts
            </h2>

            <p class="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">
              Invite teachers and students by email. Users can set their own
              passwords and access the appropriate dashboard after accepting
              their invitation.
            </p>

            <button
              type="button"
              (click)="openInvite()"
              class="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Invite a User
            </button>
          </div>

          <div class="pointer-events-none absolute -right-10 -top-16 hidden h-72 w-72 rounded-full border-[35px] border-white/5 sm:block"></div>
          <div class="pointer-events-none absolute -bottom-28 right-20 hidden h-64 w-64 rounded-full border-[30px] border-white/5 sm:block"></div>
        </section>

        <!-- Settings Cards -->
        <section class="grid gap-5 lg:grid-cols-3">

          <!-- User Access -->
          <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div class="flex items-start justify-between">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" />
                </svg>
              </div>
              <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                User Management
              </span>
            </div>

            <h3 class="mt-4 font-bold text-slate-800">User Access</h3>
            <p class="mt-2 min-h-10 text-sm leading-5 text-slate-500">
              Create invitations for new teachers and students.
            </p>

            <button
              type="button"
              (click)="openInvite()"
              class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
            >
              Invite teacher or student
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </article>

          <!-- Invitations -->
          <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m4 7 8 6 8-6M16 3v4M20 5h-8" />
              </svg>
            </div>

            <h3 class="mt-4 font-bold text-slate-800">Email Invitations</h3>
            <p class="mt-2 min-h-10 text-sm leading-5 text-slate-500">
              Send account invitations securely through Supabase.
            </p>

            <span class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <span class="h-2 w-2 rounded-full bg-violet-500"></span>
              Edge Function required
            </span>
          </article>

          <!-- Security -->
          <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.8">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
              </svg>
            </div>

            <h3 class="mt-4 font-bold text-slate-800">Password & Security</h3>
            <p class="mt-2 min-h-10 text-sm leading-5 text-slate-500">
              Let invited users set their passwords through a secure link.
            </p>

            <span class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <span class="h-2 w-2 rounded-full bg-amber-500"></span>
              Password page to test
            </span>
          </article>
        </section>

        <!-- Account Access Guide -->
        <section class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 class="font-bold text-slate-800">Account Access Workflow</h2>
            <p class="mt-1 text-sm text-slate-500">
              How new users receive access to EduCore.
            </p>
          </div>

          <div class="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">

            <div class="flex gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">1. Admin invites</h3>
                <p class="mt-1 text-sm leading-5 text-slate-500">
                  Admin enters the person's name, email and role.
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="m4 7 8 6 8-6" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">2. User gets email</h3>
                <p class="mt-1 text-sm leading-5 text-slate-500">
                  A secure invitation link is sent to the user.
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8 12 2.5 2.5L16 9" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">3. User activates</h3>
                <p class="mt-1 text-sm leading-5 text-slate-500">
                  The user sets a password and signs in.
                </p>
              </div>
            </div>

          </div>
        </section>

        

      </div>
    </div>

    <!-- Invite User Modal -->
    @if (inviteOpen()) {
      <div class="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
        <div class="flex min-h-full items-center justify-center">
          <form
            #inviteNgForm="ngForm"
            (ngSubmit)="prepareInvitation()"
            class="my-auto w-full max-w-lg space-y-5 rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900">Invite a User</h2>
                  <p class="mt-1 text-sm text-slate-500">
                    Enter the account details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                (click)="closeInvite()"
                aria-label="Close invitation form"
                class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <!-- Full Name -->
            <div class="space-y-1.5">
              <label for="invite-name" class="block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                id="invite-name"
                name="fullName"
                [(ngModel)]="form.fullName"
                required
                maxlength="120"
                placeholder="Enter user's full name"
                class="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <!-- Email -->
            <div class="space-y-1.5">
              <label for="invite-email" class="block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                name="email"
                [(ngModel)]="form.email"
                required
                email
                placeholder="name@example.com"
                class="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <!-- Role -->
            <div class="space-y-1.5">
              <label for="invite-role" class="block text-sm font-semibold text-slate-700">
                User Role
              </label>
              <select
                id="invite-role"
                name="role"
                [(ngModel)]="form.role"
                required
                class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
              </select>
              <p class="text-xs text-slate-400">
                Access permissions will be assigned according to this role.
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                (click)="closeInvite()"
                [disabled]="sending()"
                class="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                [disabled]="inviteNgForm.invalid || sending()"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                @if (sending()) {
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9" stroke-opacity=".25" />
                    <path stroke-linecap="round" d="M21 12a9 9 0 0 0-9-9" />
                  </svg>
                  Sending invitation...
                } @else {
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                  </svg>
                  Send Invitation
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class SettingsComponent {
  private readonly invitationService = inject(InvitationService);
  private readonly toast = inject(Toast);

  readonly inviteOpen = signal(false);
  readonly sending = signal(false);

  form: InviteForm = this.emptyForm();

  openInvite(): void {
    this.form = this.emptyForm();
    this.sending.set(false);
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    if (this.sending()) {
      return;
    }

    this.inviteOpen.set(false);
  }

  async prepareInvitation(): Promise<void> {
    if (this.sending()) {
      return;
    }

    const fullName = this.form.fullName.trim();
    const email = this.form.email.trim().toLowerCase();

    if (!fullName || !email) {
      this.toast.warning('Please enter the full name and email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toast.warning('Please enter a valid email address.');
      return;
    }

    this.sending.set(true);

    try {
      const message = await this.invitationService.inviteUser({
        fullName,
        email,
        role: this.form.role.toLowerCase() as InvitationRole,
      });

      this.toast.success(
        `${message} Check the recipient's inbox and spam folder.`,
        'Invitation Sent',
      );

      this.sending.set(false);
      this.closeInvite();
    } catch (error: unknown) {
      this.toast.error(
        error instanceof Error
          ? error.message
          : 'Invitation could not be sent. Please try again.',
        'Invitation Failed',
      );
    } finally {
      this.sending.set(false);
    }
  }

  private emptyForm(): InviteForm {
    return {
      fullName: '',
      email: '',
      role: 'Student',
    };
  }
}