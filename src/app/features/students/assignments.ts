import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AssignmentRecord,
  AssignmentService,
  AssignmentSubmission,
} from '../../core/services/assignment.service';
import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

@Component({
  selector: 'app-student-assignments',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <span class="kicker">Coursework</span>
      <h1>Assignments</h1>
      <p>Your assignments and submission deadlines appear here.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading assignments...</div>
    } @else if (assignments().length === 0) {
      <div class="state">
        <strong>No assignments yet</strong>
        No assignments have been published for your batch.
      </div>
    } @else {
      <div class="cards">
        @for (a of assignments(); track a.id) {
          <div class="assignment-card" [class.expired]="isExpired(a.deadline) && !submissionFor(a)">
            <div class="assignment-header">
              <h3>{{ a.title }}</h3>
              <span class="status-badge" [class.open]="a.status === 'open'" [class.closed]="a.status === 'closed'">
                {{ a.status }}
              </span>
            </div>

            @if (a.description) {
              <p class="assignment-desc">{{ a.description }}</p>
            }

            <div class="assignment-meta">
              <div class="meta-item">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                <span>{{ a.total_marks }} marks</span>
              </div>

              @if (a.deadline) {
                <div class="meta-item" [class.expired]="isExpired(a.deadline)">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <span>{{ isExpired(a.deadline) ? 'Expired:' : 'Due:' }} {{ formatDate(a.deadline) }}</span>
                </div>
              }
            </div>

            @if (a.attachment_url) {
              <a [href]="a.attachment_url" target="_blank" rel="noopener noreferrer" class="attachment-link">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                View Attachment
              </a>
            }

            <!-- My submission info -->
            @if (submissionFor(a); as s) {
              <div class="my-submission" [class.checked]="s.status === 'checked'">
                <div class="ms-top">
                  <strong>{{ s.status === 'checked' ? 'Checked' : 'Submitted' }}</strong>
                  <small>{{ formatDate(s.submitted_at) }}</small>
                </div>

                @if (s.status === 'checked') {
                  <div class="ms-marks">Marks: {{ s.marks ?? 0 }} / {{ a.total_marks }}</div>
                  @if (s.feedback) {
                    <p class="ms-feedback">Feedback: {{ s.feedback }}</p>
                  }
                }

                @if (s.file_url) {
                  <a [href]="s.file_url" target="_blank" rel="noopener noreferrer" class="ms-file">
                    View my file
                  </a>
                }
              </div>
            }

            <button
              type="button"
              class="submit-btn"
              [disabled]="isButtonDisabled(a)"
              (click)="openSubmit(a)"
            >
              {{ buttonLabel(a) }}
            </button>
          </div>
        }
      </div>
    }

    <!-- Submit modal -->
    @if (active(); as a) {
      <div class="modal-backdrop" (click)="closeSubmit()">
        <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <h2>{{ submissionFor(a) ? 'Update Submission' : 'Submit Assignment' }}</h2>
              <p>{{ a.title }}</p>
            </div>
            <button type="button" class="modal-close" (click)="closeSubmit()" aria-label="Close">✕</button>
          </div>

          <div class="modal-body">
            <label class="m-label" for="sub-content">Your answer</label>
            <textarea
              id="sub-content"
              class="m-input"
              rows="6"
              maxlength="5000"
              placeholder="Write your answer here (optional if you attach a file)"
              [ngModel]="content()"
              (ngModelChange)="content.set($event)"
            ></textarea>

            <label class="m-label" for="sub-file">Attach file (PDF, Word or image, max 10 MB)</label>
            <input
              id="sub-file"
              type="file"
              class="m-file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              (change)="onFileChange($event)"
            />
            @if (file(); as f) {
              <p class="m-hint">Selected: {{ f.name }}</p>
            } @else if (submissionFor(a)?.file_url) {
              <p class="m-hint">A file is already uploaded. Choose a new one only if you want to replace it.</p>
            }
          </div>

          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="closeSubmit()" [disabled]="submitting()">
              Cancel
            </button>
            <button type="button" class="submit-btn" (click)="submit()" [disabled]="submitting()">
              {{ submitting() ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [PAGE_STYLES, `
    .assignment-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #fff;
      padding: 20px;
      box-shadow: 0 2px 4px rgb(15 23 42 / 4%);
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }

    .assignment-card:hover {
      border-color: #93c5fd;
      box-shadow: 0 10px 24px rgb(15 23 42 / 8%);
      transform: translateY(-1px);
    }

    .assignment-card.expired { opacity: 0.7; }

    .assignment-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .assignment-header h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      color: #020617;
      line-height: 1.4;
    }

    .status-badge {
      flex: 0 0 auto;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-badge.open { background: #dcfce7; color: #15803d; }
    .status-badge.closed { background: #fee2e2; color: #991b1b; }

    .assignment-desc {
      margin: 0;
      color: #64748b;
      font-size: 12.5px;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .assignment-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
      font-size: 11.5px;
      font-weight: 600;
    }

    .meta-item.expired { color: #dc2626; }

    .icon { width: 15px; height: 15px; color: #94a3b8; }
    .meta-item.expired .icon { color: #dc2626; }

    .attachment-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      color: #1d4ed8;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      transition: background .2s ease, border-color .2s ease;
      width: fit-content;
    }

    .attachment-link:hover { background: #eff6ff; border-color: #93c5fd; }

    /* My submission box */
    .my-submission {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 14px;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: #eff6ff;
      color: #1e3a8a;
      font-size: 12px;
    }

    .my-submission.checked { border-color: #bbf7d0; background: #f0fdf4; color: #14532d; }

    .ms-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .ms-top strong { font-size: 12px; font-weight: 900; }
    .ms-top small { font-size: 10.5px; opacity: .8; }
    .ms-marks { font-size: 13px; font-weight: 900; }
    .ms-feedback { margin: 0; font-size: 11.5px; line-height: 1.55; }
    .ms-file { width: fit-content; color: inherit; font-size: 11.5px; font-weight: 800; text-decoration: underline; }

    .submit-btn {
      padding: 11px 18px;
      border: 0;
      border-radius: 11px;
      background: #1d4ed8;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      font-family: inherit;
      cursor: pointer;
      transition: background .2s ease;
    }

    .submit-btn:hover:not(:disabled) { background: #1e40af; }
    .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgb(2 6 23 / 60%);
      backdrop-filter: blur(3px);
    }

    .modal {
      display: flex;
      flex-direction: column;
      width: min(100%, 520px);
      max-height: calc(100dvh - 32px);
      overflow: hidden;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 24px 60px rgb(2 6 23 / 35%);
    }

    .modal-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid #eef2f7;
    }

    .modal-head h2 { margin: 0; font-size: 16px; font-weight: 900; color: #020617; }
    .modal-head p { margin: 4px 0 0; color: #64748b; font-size: 12px; }

    .modal-close {
      border: 0;
      border-radius: 8px;
      background: #f1f5f9;
      color: #334155;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 13px;
    }

    .modal-close:hover { background: #e2e8f0; }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 18px 20px;
      overflow-y: auto;
    }

    .m-label { color: #0f172a; font-size: 12px; font-weight: 800; margin-top: 6px; }

    .m-input {
      width: 100%;
      padding: 11px 13px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
      color: #0f172a;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.55;
      resize: vertical;
      outline: none;
    }

    .m-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgb(37 99 235 / 12%); }

    .m-file {
      width: 100%;
      padding: 10px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      font-family: inherit;
      font-size: 12px;
    }

    .m-hint { margin: 2px 0 0; color: #64748b; font-size: 11.5px; }

    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid #eef2f7;
      background: #f8fafc;
    }

    .btn-cancel {
      padding: 11px 18px;
      border: 1px solid #e2e8f0;
      border-radius: 11px;
      background: #fff;
      color: #334155;
      font-size: 12px;
      font-weight: 800;
      font-family: inherit;
      cursor: pointer;
    }

    .btn-cancel:hover:not(:disabled) { background: #f1f5f9; }
    .btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class StudentAssignments implements OnInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly toast = inject(Toast);

  readonly assignments = signal<AssignmentRecord[]>([]);
  readonly submissions = signal<Map<number, AssignmentSubmission>>(new Map());
  readonly loading = signal(true);

  // Submit modal state
  readonly active = signal<AssignmentRecord | null>(null);
  readonly content = signal('');
  readonly file = signal<File | null>(null);
  readonly submitting = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [assignments, submissions] = await Promise.all([
        this.assignmentService.getAssignmentsForStudent(),
        this.assignmentService.getMySubmissions().catch(() => [] as AssignmentSubmission[]),
      ]);

      this.assignments.set(assignments);
      this.submissions.set(new Map(submissions.map(s => [s.assignment_id, s])));
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Unable to load assignments.',
        'Error'
      );
    } finally {
      this.loading.set(false);
    }
  }

  submissionFor(a: AssignmentRecord): AssignmentSubmission | null {
    return this.submissions().get(a.id) ?? null;
  }

  isButtonDisabled(a: AssignmentRecord): boolean {
    const sub = this.submissionFor(a);
    if (sub?.status === 'checked') return true;
    return a.status === 'closed' || this.isExpired(a.deadline);
  }

  buttonLabel(a: AssignmentRecord): string {
    const sub = this.submissionFor(a);
    if (sub?.status === 'checked') return 'Checked';
    if (a.status === 'closed' || this.isExpired(a.deadline)) {
      return sub ? 'Submitted' : 'Closed';
    }
    return sub ? 'Update Submission' : 'Submit Assignment';
  }

  openSubmit(a: AssignmentRecord): void {
    if (this.isButtonDisabled(a)) return;
    const existing = this.submissionFor(a);
    this.content.set(existing?.content ?? '');
    this.file.set(null);
    this.active.set(a);
  }

  closeSubmit(): void {
    if (this.submitting()) return;
    this.active.set(null);
    this.content.set('');
    this.file.set(null);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  async submit(): Promise<void> {
    const a = this.active();
    if (!a || this.submitting()) return;

    this.submitting.set(true);
    try {
      const saved = await this.assignmentService.submitAssignment(
        a.id,
        this.content(),
        this.file(),
      );

      const next = new Map(this.submissions());
      next.set(saved.assignment_id, saved);
      this.submissions.set(next);

      this.toast.success('Your assignment has been submitted.', 'Submitted');
      this.submitting.set(false);
      this.closeSubmit();
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Unable to submit assignment.',
        'Submission Failed'
      );
      this.submitting.set(false);
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isExpired(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  }
}