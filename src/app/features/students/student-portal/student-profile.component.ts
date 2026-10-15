
import { Component, OnInit, inject } from '@angular/core';
import { PAGE_STYLES } from './student-portal.styles';
import { StudentDataService, pick } from './student-data.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  template: `
    <div class="profile-page">

      <!-- Page Heading -->
      <header class="page-head">
        <div>
          <span class="kicker">STUDENT PORTAL / ACCOUNT</span>
          <h1>My Profile</h1>
          <p>Manage and review your personal, academic, and enrollment information.</p>
        </div>

        <div class="secure-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Verified Student Account</span>
        </div>
      </header>

      @if (profile(); as p) {

        <!-- Student Overview Hero -->
        <section class="profile-hero">
          <div class="hero-decoration decoration-one"></div>
          <div class="hero-decoration decoration-two"></div>

          <div class="hero-main">
            <div class="avatar-wrap">
              <div class="big-avatar">{{ initials(p.fullName) }}</div>
              <span class="avatar-status" title="Active session"></span>
            </div>

            <div class="hero-info">
              <span class="hero-eyebrow">ACADEMIC PROFILE</span>
              <h2>{{ p.fullName || 'Student' }}</h2>
              <p class="hero-email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <span>{{ p.email || 'Email not provided' }}</span>
              </p>

              <div class="hero-tags">
                <span class="hero-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
                    <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5" />
                  </svg>
                  {{ p.courseName || 'Course not assigned' }}
                </span>

                <span class="hero-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  {{ p.batchName || 'Batch not assigned' }}
                </span>
              </div>
            </div>
          </div>

          <div class="hero-side">
            <span class="hero-side-label">ENROLLMENT STATUS</span>
            <span class="status-pill" [attr.data-status]="statusClass()">
              <span class="status-indicator"></span>
              {{ statusLabel() }}
            </span>
            <span class="hero-side-note">LMS Verified Record</span>
          </div>
        </section>

        <!-- Quick Information Cards -->
        <section class="quick-stats">
          <article class="quick-card">
            <div class="quick-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
                <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5" />
              </svg>
            </div>
            <div class="quick-content">
              <span>Enrolled Course</span>
              <strong>{{ p.courseName || 'Not assigned' }}</strong>
            </div>
          </article>

          <article class="quick-card">
            <div class="quick-icon violet">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            </div>
            <div class="quick-content">
              <span>Current Batch</span>
              <strong>{{ p.batchName || 'Not assigned' }}</strong>
            </div>
          </article>

          <article class="quick-card">
            <div class="quick-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </div>
            <div class="quick-content">
              <span>Account Type</span>
              <strong>Student Portal</strong>
            </div>
          </article>
        </section>

        <!-- Information Sections Header -->
        <div class="section-heading">
          <div>
            <h2>Profile Information</h2>
            <p>Comprehensive breakdown of your academic and personal registry.</p>
          </div>
          <span class="read-only-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
            Secure View
          </span>
        </div>

        <div class="info-grid">

          <!-- Personal Information -->
          <section class="info-card">
            <div class="card-heading">
              <div class="section-icon personal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                </svg>
              </div>
              <div>
                <h3>Personal Information</h3>
                <p>Basic identification and contact details</p>
              </div>
            </div>

            <dl class="details-list">
              <div class="detail-row">
                <dt>Full Name</dt>
                <dd>{{ p.fullName || '—' }}</dd>
              </div>
              <div class="detail-row">
                <dt>Email Address</dt>
                <dd>{{ p.email || '—' }}</dd>
              </div>
              <div class="detail-row">
                <dt>Phone Number</dt>
                <dd>{{ val(['phone', 'student_phone', 'mobile', 'phone_number']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>CNIC / B-Form</dt>
                <dd>{{ val(['cnic', 'student_cnic', 'b_form', 'b_form_number']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Gender</dt>
                <dd>{{ val(['gender', 'sex']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Date of Birth</dt>
                <dd>{{ val(['date_of_birth', 'dob', 'birth_date']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Address</dt>
                <dd>{{ val(['address', 'permanent_address', 'current_address']) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Academic Information -->
          <section class="info-card">
            <div class="card-heading">
              <div class="section-icon academic-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
                  <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5" />
                  <path d="M21.5 9v6" />
                </svg>
              </div>
              <div>
                <h3>Academic Information</h3>
                <p>Course enrollment & education metrics</p>
              </div>
            </div>

            <dl class="details-list">
              <div class="detail-row">
                <dt>Course</dt>
                <dd>{{ p.courseName || '—' }}</dd>
              </div>
              <div class="detail-row">
                <dt>Batch</dt>
                <dd>{{ p.batchName || '—' }}</dd>
              </div>
              <div class="detail-row">
                <dt>Qualification</dt>
                <dd>{{ val(['last_education', 'qualification', 'education', 'highest_qualification']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Institution</dt>
                <dd>{{ val(['institution', 'school_name', 'college_name', 'university']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Student Status</dt>
                <dd>
                  <span class="inline-status" [attr.data-status]="statusClass()">
                    {{ statusLabel() }}
                  </span>
                </dd>
              </div>
              <div class="detail-row">
                <dt>Laptop Available</dt>
                <dd>{{ laptop() }}</dd>
              </div>
            </dl>
          </section>

          <!-- Guardian Information -->
          <section class="info-card">
            <div class="card-heading">
              <div class="section-icon guardian-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20" />
                  <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 5.5V20" />
                </svg>
              </div>
              <div>
                <h3>Guardian Information</h3>
                <p>Parent or emergency guardian details</p>
              </div>
            </div>

            <dl class="details-list">
              <div class="detail-row">
                <dt>Father / Guardian Name</dt>
                <dd>{{ val(['father_name', 'guardian_name', 'parent_name']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Guardian Phone</dt>
                <dd>{{ val(['father_phone', 'guardian_phone', 'parent_phone', 'father_mobile']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Guardian CNIC</dt>
                <dd>{{ val(['father_cnic', 'guardian_cnic', 'parent_cnic']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Relationship</dt>
                <dd>{{ val(['guardian_relation', 'relationship', 'parent_relation']) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Additional Details -->
          <section class="info-card">
            <div class="card-heading">
              <div class="section-icon additional-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
              </div>
              <div>
                <h3>Additional Details</h3>
                <p>Regional and secondary tracking info</p>
              </div>
            </div>

            <dl class="details-list">
              <div class="detail-row">
                <dt>City</dt>
                <dd>{{ val(['city', 'student_city']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Province / State</dt>
                <dd>{{ val(['province', 'state', 'region']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Country</dt>
                <dd>{{ val(['country', 'student_country']) }}</dd>
              </div>
              <div class="detail-row">
                <dt>Emergency Contact</dt>
                <dd>{{ val(['emergency_contact', 'emergency_phone', 'alternate_phone']) }}</dd>
              </div>
            </dl>
          </section>

        </div>

        <!-- Support Note -->
        <section class="support-note">
          <div class="support-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
          </div>
          <div>
            <h3>Need to update your registered information?</h3>
            <p>
              Your profile data is synchronized with the central admission database.
              Please contact your campus administration or support desk to raise a profile update request.
            </p>
          </div>
        </section>

      } @else {
        <section class="loading-card">
          <span class="spinner"></span>
          <h2>Loading your profile</h2>
          <p>Please wait while we retrieve your student credentials from the LMS...</p>
        </section>
      }

    </div>
  `,
  styles: [PAGE_STYLES, `
    :host {
      display: block;
      color: #0f172a;
      font-family: inherit;
    }

    * {
      box-sizing: border-box;
    }

    .profile-page {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 10px 4px 40px;
    }

    /* PAGE HEADER */
    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 28px;
    }

    .page-head .kicker {
      display: inline-block;
      margin-bottom: 6px;
      color: #2563eb;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .12em;
    }

    .page-head h1 {
      margin: 0;
      color: #0f172a;
      font-size: clamp(26px, 2.8vw, 34px);
      font-weight: 700;
      letter-spacing: -.03em;
      line-height: 1.2;
    }

    .page-head p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 13.5px;
      font-weight: 400;
      line-height: 1.6;
    }

    .secure-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      padding: 8px 14px;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      background: #eff6ff;
      color: #1e40af;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }

    .secure-badge svg {
      width: 16px;
      height: 16px;
    }

    /* STUDENT HERO SECTION */
    .profile-hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      min-width: 0;
      overflow: hidden;
      margin-bottom: 20px;
      padding: 28px;
      border: 1px solid #1e293b;
      border-radius: 20px;
      background:
        radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.25), transparent 45%),
        linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }

    .hero-decoration {
      position: absolute;
      pointer-events: none;
      border: 1px solid rgba(147, 197, 253, 0.08);
      border-radius: 50%;
    }

    .decoration-one {
      top: -120px;
      right: 60px;
      width: 280px;
      height: 280px;
    }

    .decoration-two {
      top: -80px;
      right: 100px;
      width: 200px;
      height: 200px;
    }

    .hero-main {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 20px;
      min-width: 0;
    }

    .avatar-wrap {
      position: relative;
      flex: 0 0 auto;
    }

    .big-avatar {
      display: grid;
      place-items: center;
      width: 80px;
      height: 80px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #fff;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -.03em;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
    }

    .avatar-status {
      position: absolute;
      right: -2px;
      bottom: -2px;
      width: 16px;
      height: 16px;
      border: 3px solid #0f172a;
      border-radius: 50%;
      background: #10b981;
    }

    .hero-info {
      min-width: 0;
    }

    .hero-eyebrow {
      color: #93c5fd;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .14em;
    }

    .hero-info h2 {
      margin: 6px 0 6px;
      color: #fff;
      font-size: clamp(20px, 2.2vw, 26px);
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -.02em;
      overflow-wrap: anywhere;
    }

    .hero-email {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 400;
      overflow-wrap: anywhere;
    }

    .hero-email svg {
      width: 15px;
      height: 15px;
      flex: 0 0 15px;
      color: #93c5fd;
    }

    .hero-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      padding: 5px 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.07);
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 500;
    }

    .hero-tag svg {
      width: 13px;
      height: 13px;
      flex: 0 0 13px;
      color: #93c5fd;
    }

    .hero-side {
      position: relative;
      z-index: 1;
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      min-width: 160px;
      padding-left: 24px;
      border-left: 1px solid rgba(255, 255, 255, 0.12);
    }

    .hero-side-label {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 8px;
      background: rgba(22, 163, 74, 0.15);
      color: #4ade80;
      font-size: 12px;
      font-weight: 600;
    }

    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-pill[data-status="inactive"],
    .inline-status[data-status="inactive"] {
      border-color: #fed7aa;
      background: #fff7ed;
      color: #c2410c;
    }

    .status-pill[data-status="pending"],
    .inline-status[data-status="pending"] {
      border-color: #fde68a;
      background: #fffbeb;
      color: #b45309;
    }

    .status-pill[data-status="unknown"],
    .inline-status[data-status="unknown"] {
      border-color: #cbd5e1;
      background: #f1f5f9;
      color: #475569;
    }

    .hero-side-note {
      color: #94a3b8;
      font-size: 11px;
    }

    /* QUICK CARDS */
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .quick-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
      transition: all 0.2s ease;
    }

    .quick-card:hover {
      transform: translateY(-2px);
      border-color: #cbd5e1;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    }

    .quick-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      border-radius: 12px;
    }

    .quick-icon svg {
      width: 22px;
      height: 22px;
    }

    .quick-icon.blue { background: #eff6ff; color: #2563eb; }
    .quick-icon.violet { background: #f5f3ff; color: #7c3aed; }
    .quick-icon.green { background: #ecfdf5; color: #059669; }

    .quick-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .quick-content > span {
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
    }

    .quick-content strong {
      color: #0f172a;
      font-size: 13px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    /* SECTION TITLE */
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section-heading h2 {
      margin: 0;
      color: #0f172a;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -.02em;
    }

    .section-heading p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12.5px;
    }

    .read-only-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
    }

    .read-only-tag svg {
      width: 14px;
      height: 14px;
    }

    /* INFORMATION GRID */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    .info-card {
      padding: 22px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .info-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
    }

    .card-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .section-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border-radius: 12px;
    }

    .section-icon svg { width: 20px; height: 20px; }

    .personal-icon { background: #eff6ff; color: #2563eb; }
    .academic-icon { background: #f5f3ff; color: #7c3aed; }
    .guardian-icon { background: #ecfdf5; color: #059669; }
    .additional-icon { background: #fff7ed; color: #ea580c; }

    .card-heading h3 {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 700;
    }

    .card-heading p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 11px;
    }

    .details-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid #f8fafc;
    }

    .detail-row:first-child { padding-top: 0; }
    .detail-row:last-child { padding-bottom: 0; border-bottom: none; }

    dt {
      flex: 0 0 40%;
      margin: 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
    }

    dd {
      min-width: 0;
      margin: 0;
      color: #0f172a;
      font-size: 12.5px;
      font-weight: 600;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .inline-status {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      background: #f0fdf4;
      color: #15803d;
      font-size: 11px;
      font-weight: 600;
    }

    /* SUPPORT NOTE */
    .support-note {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-top: 24px;
      padding: 18px;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      background: #f8fbff;
    }

    .support-icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      border-radius: 10px;
      background: #dbeafe;
      color: #2563eb;
    }

    .support-icon svg { width: 18px; height: 18px; }

    .support-note h3 {
      margin: 0 0 4px;
      color: #1e40af;
      font-size: 13px;
      font-weight: 600;
    }

    .support-note p {
      margin: 0;
      color: #475569;
      font-size: 12px;
      line-height: 1.6;
    }

    /* LOADING STATE */
    .loading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #fff;
      text-align: center;
    }

    .spinner {
      width: 36px;
      height: 36px;
      margin-bottom: 16px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: profile-spin 0.75s linear infinite;
    }

    .loading-card h2 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 600;
    }

    .loading-card p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 12.5px;
    }

    @keyframes profile-spin {
      to { transform: rotate(360deg); }
    }

    /* RESPONSIVE MEDIA QUERIES */
    @media (max-width: 1024px) {
      .profile-hero {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-side {
        width: 100%;
        padding: 16px 0 0;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        border-left: none;
      }
    }

    @media (max-width: 768px) {
      .quick-stats {
        grid-template-columns: 1fr;
      }
      .info-grid {
        grid-template-columns: 1fr;
      }
      .page-head {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class StudentProfileComponent implements OnInit {
  private readonly data = inject(StudentDataService);
  readonly profile = this.data.profile;

  async ngOnInit(): Promise<void> {
    await this.data.load();
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'S';
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  val(keys: string[]): string {
    return pick(this.profile()?.raw, keys) || '—';
  }

  statusLabel(): string {
    const value = pick(this.profile()?.raw, ['status', 'student_status']).trim();
    if (!value) return 'Not specified';
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  statusClass(): string {
    const value = pick(this.profile()?.raw, ['status', 'student_status']).trim().toLowerCase();
    if (!value) return 'unknown';
    if (['inactive', 'suspended', 'rejected', 'blocked', 'withdrawn'].includes(value)) return 'inactive';
    if (['pending', 'applied', 'under_review', 'under review'].includes(value)) return 'pending';
    return 'active';
  }

  laptop(): string {
    const value = pick(this.profile()?.raw, ['laptop_available', 'laptop']).trim().toLowerCase();
    if (!value) return '—';
    if (['true', 'yes', '1', 'available'].includes(value)) return 'Yes';
    if (['false', 'no', '0', 'unavailable'].includes(value)) return 'No';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}