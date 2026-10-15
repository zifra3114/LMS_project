import { Component, OnInit, inject, signal } from '@angular/core';
import { Toast } from '../../core/services/toast.service';
import { PAGE_STYLES } from './student-portal/student-portal.styles';
import { StudentDataService, Row, pick, fmtDate } from './student-portal/student-data.service';

@Component({
  selector: 'app-student-results',
  standalone: true,
  template: `
    <div class="page-head">
      <span class="kicker">Academic Performance</span>
      <h1>My Results</h1>
      <p>Your quiz and assignment results appear here.</p>
    </div>

    @if (loading()) {
      <div class="state"><span class="spinner"></span>Loading results...</div>
    } @else if (results().length === 0) {
      <div class="state">
        <strong>No results published yet</strong>
        Your results will appear here once they are published by your instructor.
      </div>
    } @else {
      <div class="cards">
        @for (r of results(); track $index) {
          <div class="result-card" [class.passed]="isPassed(r)" [class.failed]="!isPassed(r)">
            <div class="result-header">
              <div>
                <h3>{{ getTitle(r) }}</h3>
                <p class="result-type">{{ getType(r) }}</p>
              </div>
              <div class="score-circle" [class.passed]="isPassed(r)" [class.failed]="!isPassed(r)">
                <span class="score">{{ getMarks(r) }}</span>
                <span class="total">/{{ getTotalMarks(r) }}</span>
              </div>
            </div>

            <div class="result-meta">
              @if (getPercentage(r)) {
                <div class="meta-item">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>{{ getPercentage(r) }}%</span>
                </div>
              }

              @if (getDate(r)) {
                <div class="meta-item">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <span>{{ getDate(r) }}</span>
                </div>
              }
            </div>

            @if (getStatus(r)) {
              <div class="result-status" [class.passed]="isPassed(r)" [class.failed]="!isPassed(r)">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (isPassed(r)) {
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  } @else {
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  }
                </svg>
                <span>{{ getStatus(r) }}</span>
              </div>
            }

            @if (getFeedback(r)) {
              <div class="feedback-box">
                <strong>Feedback:</strong>
                <p>{{ getFeedback(r) }}</p>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [PAGE_STYLES, `
    .result-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #fff;
      padding: 20px;
      box-shadow: 0 2px 4px rgb(15 23 42 / 4%);
      transition: border-color .18s ease, box-shadow .18s ease;
    }

    .result-card:hover {
      box-shadow: 0 10px 24px rgb(15 23 42 / 8%);
    }

    .result-card.passed {
      border-color: #86efac;
      background: linear-gradient(to bottom, #f0fdf4 0%, #fff 100%);
    }

    .result-card.failed {
      border-color: #fca5a5;
      background: linear-gradient(to bottom, #fef2f2 0%, #fff 100%);
    }

    .result-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .result-header h3 {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 900;
      color: #020617;
      line-height: 1.4;
    }

    .result-type {
      margin: 0;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-circle {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 3px solid #e2e8f0;
      background: #f8fafc;
    }

    .score-circle.passed {
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .score-circle.failed {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .score {
      font-size: 20px;
      font-weight: 900;
      color: #020617;
      line-height: 1;
    }

    .total {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }

    .result-meta {
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

    .icon {
      width: 15px;
      height: 15px;
      color: #94a3b8;
    }

    .result-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
    }

    .result-status.passed {
      background: #dcfce7;
      color: #15803d;
    }

    .result-status.passed .icon {
      color: #15803d;
    }

    .result-status.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .result-status.failed .icon {
      color: #991b1b;
    }

    .feedback-box {
      padding: 14px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .feedback-box strong {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .feedback-box p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.6;
    }

    @media (max-width: 639px) {
      .result-header {
        flex-direction: column-reverse;
        align-items: center;
        text-align: center;
      }

      .score-circle {
        width: 80px;
        height: 80px;
      }
    }
  `],
})
export class StudentResults implements OnInit {
  private readonly data = inject(StudentDataService);
  private readonly toast = inject(Toast);

  readonly results = signal<Row[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.results.set(await this.data.list('results', { own: true }));
    } catch (e) {
      this.toast.error(
        (e as { message?: string })?.message || 'Unable to load results.',
        'Error'
      );
    } finally {
      this.loading.set(false);
    }
  }

  getTitle(r: Row): string {
    return pick(r, ['title', 'quiz_title', 'assignment_title', 'name', 'subject']) || 'Result';
  }

  getType(r: Row): string {
    return pick(r, ['type', 'result_type', 'assessment_type']) || 'Assessment';
  }

  getMarks(r: Row): string {
    return pick(r, ['marks', 'obtained_marks', 'score']) || '0';
  }

  getTotalMarks(r: Row): string {
    return pick(r, ['total_marks', 'max_marks', 'maximum_marks']) || '100';
  }

  getPercentage(r: Row): string {
    const marks = parseFloat(this.getMarks(r));
    const total = parseFloat(this.getTotalMarks(r));
    if (!total || isNaN(marks) || isNaN(total)) return '';
    return ((marks / total) * 100).toFixed(1);
  }

  getDate(r: Row): string {
    const dateStr = pick(r, ['created_at', 'published_at', 'date', 'submitted_at']);
    return dateStr ? fmtDate(dateStr) : '';
  }

  getStatus(r: Row): string {
    return pick(r, ['status', 'result_status', 'grade']) || '';
  }

  getFeedback(r: Row): string {
    return pick(r, ['feedback', 'remarks', 'comments', 'description']) || '';
  }

  isPassed(r: Row): boolean {
    const status = this.getStatus(r).toLowerCase();
    if (status.includes('pass')) return true;
    if (status.includes('fail')) return false;

    // Fallback: check if marks >= passing marks or >= 40%
    const marks = parseFloat(this.getMarks(r));
    const total = parseFloat(this.getTotalMarks(r));
    const passing = parseFloat(pick(r, ['passing_marks', 'pass_marks']) || '');

    if (!isNaN(passing) && !isNaN(marks)) {
      return marks >= passing;
    }

    // Default: 40% passing
    if (!isNaN(marks) && !isNaN(total) && total > 0) {
      return marks >= (total * 0.4);
    }

    return false;
  }
}
