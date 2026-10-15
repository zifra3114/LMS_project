import { Component, OnInit, inject, signal } from '@angular/core';
import { AssignmentRecord, AssignmentService } from '../../core/services/assignment.service';
import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';

@Component({
  selector: 'app-student-assignments',
  standalone: true,
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
          <div class="assignment-card" [class.expired]="isExpired(a.deadline)">
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

            <button type="button" class="submit-btn" [disabled]="a.status === 'closed' || isExpired(a.deadline)">
              {{ a.status === 'closed' || isExpired(a.deadline) ? 'Closed' : 'Submit Assignment' }}
            </button>
          </div>
        }
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

    .assignment-card.expired {
      opacity: 0.7;
    }

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

    .status-badge.open {
      background: #dcfce7;
      color: #15803d;
    }

    .status-badge.closed {
      background: #fee2e2;
      color: #991b1b;
    }

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

    .meta-item.expired {
      color: #dc2626;
    }

    .icon {
      width: 15px;
      height: 15px;
      color: #94a3b8;
    }

    .meta-item.expired .icon {
      color: #dc2626;
    }

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

    .attachment-link:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

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

    .submit-btn:hover:not(:disabled) {
      background: #1e40af;
    }

    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  `],
})
export class StudentAssignments implements OnInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly toast = inject(Toast);

  readonly assignments = signal<AssignmentRecord[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.assignments.set(await this.assignmentService.getAssignmentsForStudent());
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Unable to load assignments.',
        'Error'
      );
    } finally {
      this.loading.set(false);
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
