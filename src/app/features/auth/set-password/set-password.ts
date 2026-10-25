import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div class="w-full max-w-md">

        <!-- Brand -->
        <div class="mb-8 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.8">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            EduCore
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            Learning Management System
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">

          @if (checking()) {
            <div class="py-8 text-center">
              <div class="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"></div>
              <p class="mt-4 text-sm font-semibold text-slate-700">
                Verifying your invitation...
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Please wait while we verify your secure link.
              </p>
            </div>
          } @else if (passwordSaved()) {
            <div class="py-4 text-center">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="m5 12 4 4L19 6" />
                </svg>
              </div>

              <h2 class="mt-5 text-xl font-bold text-slate-900">
                Password Set Successfully
              </h2>

              <p class="mt-2 text-sm leading-6 text-slate-500">
                Your password has been saved. You can now sign in with your
                email and the new password.
              </p>

              <button
                type="button"
                (click)="goToLogin()"
                class="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Go to Login
              </button>

              <p class="mt-5 rounded-xl border border-green-100 bg-green-50 p-3 text-xs leading-5 text-green-800">
                Keep your password private and do not share it with anyone.
              </p>
            </div>
          } @else if (!hasSession()) {
            <div class="py-4 text-center">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path stroke-linecap="round" d="M12 8v5M12 16h.01" />
                </svg>
              </div>

              <h2 class="mt-5 text-xl font-bold text-slate-900">
                Invitation Link Invalid
              </h2>

              <p class="mt-2 text-sm leading-6 text-slate-500">
                This invitation link may be expired, already used or invalid.
                Please ask your LMS administrator to send a new invitation.
              </p>

              @if (errorMessage()) {
                <p class="mt-3 text-xs text-red-600">{{ errorMessage() }}</p>
              }
            </div>
          } @else {
            <div class="mb-6">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600">
                Account activation
              </span>
              <h2 class="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Set Your Password
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Create a strong password for your EduCore account.
              </p>
            </div>

            @if (errorMessage()) {
              <div role="alert" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
                {{ errorMessage() }}
              </div>
            }

            <form #passwordForm="ngForm" (ngSubmit)="savePassword()" class="space-y-5">

              <div class="space-y-1.5">
                <label for="new-password" class="block text-sm font-semibold text-slate-700">
                  New Password
                </label>

                <input
                  id="new-password"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  placeholder="At least 8 characters"
                  class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />

                <p class="text-xs text-slate-400">
                  Use at least 8 characters.
                </p>
              </div>

              <div class="space-y-1.5">
                <label for="confirm-password" class="block text-sm font-semibold text-slate-700">
                  Confirm Password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  autocomplete="new-password"
                  placeholder="Enter the password again"
                  class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                [disabled]="saving() || passwordForm.invalid"
                class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                @if (saving()) {
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  Saving Password...
                } @else {
                  Set Password
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                }
              </button>
            </form>
          }

        </div>

        <p class="mt-6 text-center text-xs leading-5 text-slate-400">
          EduCore · Secure account access
        </p>
      </div>
    </div>
  `,
})
export class SetPasswordComponent implements OnInit {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  readonly checking = signal(true);
  readonly hasSession = signal(false);
  readonly saving = signal(false);
  readonly passwordSaved = signal(false);
  readonly errorMessage = signal('');

  password = '';
  confirmPassword = '';

  // Invite ke waqt jo role metadata mein gaya tha (teacher / student)
  private role = '';

  async ngOnInit(): Promise<void> {
    try {
      // Supabase checks for the session established by the invitation link.
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        this.errorMessage.set('Could not verify the invitation. Please try again.');
        return;
      }

      this.hasSession.set(!!data.session);
      this.role =
        (data.session?.user.user_metadata?.['role'] as string | undefined) ?? '';
    } catch {
      this.errorMessage.set('Could not verify the invitation. Please try again.');
    } finally {
      this.checking.set(false);
    }
  }

  async savePassword(): Promise<void> {
    if (this.saving() || !this.hasSession()) return;

    this.errorMessage.set('');

    if (this.password.length < 8) {
      this.errorMessage.set('Password kam az kam 8 characters ka hona chahiye.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Dono passwords match nahi kar rahe.');
      return;
    }

    this.saving.set(true);

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: this.password,
      });

      if (error) {
        this.errorMessage.set(error.message);
        return;
      }

      this.passwordSaved.set(true);

      // End the invitation session on this device after password setup.
      await this.supabase.auth.signOut({ scope: 'local' });
      this.hasSession.set(false);
      this.password = '';
      this.confirmPassword = '';
    } catch {
      this.errorMessage.set('Password save nahi ho saka. Invitation link dobara verify karein.');
    } finally {
      this.saving.set(false);
    }
  }

  goToLogin(): void {
    // Teacher portal abhi nahi hai, is liye teacher ko admin login par bheja ja raha hai.
    this.router.navigateByUrl(
      this.role === 'student' ? '/student-login' : '/admin/login',
    );
  }
}