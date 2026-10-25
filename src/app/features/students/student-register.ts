import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FunctionsFetchError,
  FunctionsHttpError,
} from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';
import { Toast } from '../../core/services/toast.service';

type DbRow = Record<string, unknown>;
interface CatalogItem {
  id: string;
  name: string;
  courseId?: string;
}

@Component({
  selector: 'app-student-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="register-page">
      <header class="topbar">
        <div class="topbar-inner">
          <a routerLink="/" class="brand">
            <span class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"/>
                <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5"/><path d="M21.5 9v6"/>
              </svg>
            </span>
            <span class="brand-copy"><strong>EduCore</strong><small>STUDENT ADMISSION PORTAL</small></span>
          </a>
          <a routerLink="/" class="home-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></svg>
            Back to Home
          </a>
        </div>
      </header>

      <section class="workspace">
        <div class="ambient ambient-one"></div>
        <div class="ambient ambient-two"></div>
        <div class="workspace-inner">
          <div class="page-heading">
            <span class="admission-badge"><i></i> ADMISSIONS ARE OPEN</span>
            <h1>Start Your <span>Journey</span></h1>
            <p>Complete your registration details to begin your learning journey with EduCore.</p>
          </div>

          <div class="layout-grid">
            <aside class="side-column left-column">
              <section class="guide-card">
                <span class="mini-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                </span>
                <h2>Registration Guide</h2>
                <p class="muted-on-dark">Follow these steps to submit your admission request.</p>
                <div class="guide-steps">
                  <div class="guide-step"><b class="step-number active">01</b><div><strong>Personal details</strong><small>Contact information and address.</small></div></div>
                  <div class="guide-step"><b class="step-number">02</b><div><strong>Education &amp; guardian</strong><small>Qualification and guardian information.</small></div></div>
                  <div class="guide-step"><b class="step-number">03</b><div><strong>Course &amp; batch</strong><small>Choose your preferred course and batch.</small></div></div>
                </div>
              </section>
              <section class="info-card assistance-card">
                <div class="info-title"><span class="info-icon blue-icon">ⓘ</span><div><h3>Need assistance?</h3><p>We're here to help.</p></div></div>
                <p>If you experience issues with course or batch selection, contact your admission support team.</p>
              </section>
            </aside>

            <section class="form-card">
              <div class="form-card-header">
                <div class="header-decoration"></div>
                <span class="new-admission"><i></i> NEW ADMISSION</span>
                <h2>Student Registration</h2>
                <p>Enter accurate information in all required fields.</p>
                <span class="header-user-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/></svg>
                </span>
              </div>

              <form #registrationForm="ngForm" (ngSubmit)="registerStudent()" class="registration-form">
                <section class="form-section">
                  <div class="section-heading"><b>01</b><div><h3>Personal Information</h3><p>Your basic contact details</p></div></div>
                  <div class="field"><label for="student-name">Full Name <em>*</em></label><input id="student-name" name="fullName" [(ngModel)]="fullName" required maxlength="120" autocomplete="name" placeholder="Enter your full name" class="form-input"/></div>
                  <div class="field"><label for="student-email">Email Address <em>*</em></label><input id="student-email" type="email" name="email" [(ngModel)]="email" required email autocomplete="email" placeholder="you@example.com" class="form-input"/></div>
                  <div class="field-grid">
                    <div class="field"><label for="student-phone">Phone Number <em>*</em></label><input id="student-phone" type="tel" name="studentPhone" [ngModel]="studentPhone" (ngModelChange)="setDigits('studentPhone', $event, 11)" required pattern="[0-9]{11}" minlength="11" maxlength="11" inputmode="numeric" placeholder="03001234567" class="form-input"/></div>
                    <div class="field"><label for="student-cnic">CNIC / B-Form <em>*</em></label><input id="student-cnic" name="studentCnic" [ngModel]="studentCnic" (ngModelChange)="setDigits('studentCnic', $event, 13)" required pattern="[0-9]{13}" minlength="13" maxlength="13" inputmode="numeric" placeholder="4210112345671" class="form-input"/></div>
                  </div>
                  <div class="field"><label for="student-address">Residential Address <em>*</em></label><textarea id="student-address" name="address" [(ngModel)]="address" required maxlength="500" rows="3" placeholder="House number, street, area, city" class="form-input textarea"></textarea></div>
                </section>

                <section class="form-section">
                  <div class="section-heading"><b>02</b><div><h3>Education &amp; Equipment</h3><p>Your current qualification</p></div></div>
                  <div class="field-grid">
                    <div class="field"><label for="last-education">Qualification <em>*</em></label><input id="last-education" name="lastEducation" [(ngModel)]="lastEducation" required maxlength="150" placeholder="Matric / Intermediate" class="form-input"/></div>
                    <div class="field"><label for="laptop-availability">Laptop Availability <em>*</em></label><select id="laptop-availability" name="laptopAvailable" [(ngModel)]="laptopAvailable" required class="form-input"><option value="">Select option</option><option value="yes">Yes, I have a laptop</option><option value="no">No laptop available</option></select></div>
                  </div>
                </section>

                <section class="form-section">
                  <div class="section-heading"><b>03</b><div><h3>Guardian Information</h3><p>Parent or guardian contact details</p></div></div>
                  <div class="field"><label for="father-name">Father / Guardian Name <em>*</em></label><input id="father-name" name="fatherName" [(ngModel)]="fatherName" required maxlength="120" placeholder="Enter guardian's full name" class="form-input"/></div>
                  <div class="field-grid">
                    <div class="field"><label for="father-phone">Guardian Phone <em>*</em></label><input id="father-phone" type="tel" name="fatherPhone" [ngModel]="fatherPhone" (ngModelChange)="setDigits('fatherPhone', $event, 11)" required pattern="[0-9]{11}" minlength="11" maxlength="11" inputmode="numeric" placeholder="03001234567" class="form-input"/></div>
                    <div class="field"><label for="father-cnic">Guardian CNIC <span class="optional">(Optional)</span></label><input id="father-cnic" name="fatherCnic" [ngModel]="fatherCnic" (ngModelChange)="setDigits('fatherCnic', $event, 13)" pattern="[0-9]{13}" maxlength="13" inputmode="numeric" placeholder="4210112345671" class="form-input"/></div>
                  </div>
                </section>

                <section class="form-section">
                  <div class="section-heading"><b>04</b><div><h3>Course &amp; Batch Selection</h3><p>Choose the course you want to join</p></div></div>
                  @if (catalogLoading()) {
                    <div class="loading-note"><span class="spinner"></span>Loading available courses and batches...</div>
                  }
                  <div class="field-grid">
                    <div class="field">
                      <label for="student-course">Select Course <em>*</em></label>
                      <select id="student-course" name="courseId" [(ngModel)]="selectedCourse" (ngModelChange)="onCourseChange()" required [disabled]="catalogLoading() || courses().length === 0" class="form-input">
                        <option value="">Choose a course</option>
                        @for (course of courses(); track course.id) { <option [value]="course.id">{{ course.name }}</option> }
                      </select>
                      @if (!catalogLoading() && courses().length === 0) { <p class="field-hint error-hint">No courses are currently available.</p> }
                    </div>
                    <div class="field">
                      <label for="student-batch">Select Batch <em>*</em></label>
                      <select id="student-batch" name="batchId" [(ngModel)]="selectedBatch" required [disabled]="!selectedCourse || catalogLoading() || availableBatches.length === 0" class="form-input">
                        <option value="">Choose a batch</option>
                        @for (batch of availableBatches; track batch.id) { <option [value]="batch.id">{{ batch.name }}</option> }
                      </select>
                      @if (selectedCourse && !catalogLoading() && availableBatches.length === 0) { <p class="field-hint warning-hint">No batches available for this course.</p> }
                    </div>
                  </div>
                </section>

                <div class="privacy-note">
                  <span class="privacy-lock">▣</span>
                  <div><strong>Your information matters</strong><p>Please ensure your information is correct before submitting. Your CNIC and contact details will be sent to the registration service.</p></div>
                </div>

                <button type="submit" [disabled]="registrationForm.invalid || saving() || registered() || catalogLoading()" class="submit-button">
                  @if (saving()) { <span class="spinner button-spinner"></span> Submitting Application... }
                  @else if (registered()) { Registration Submitted }
                  @else { Submit Registration <span aria-hidden="true">→</span> }
                </button>
                <p class="login-prompt">Already registered? <a routerLink="/student-login">Student Login</a></p>
              </form>
            </section>

            <aside class="side-column right-column">
              <section class="info-card">
                <span class="info-icon green-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>
                </span>
                <h3>Secure Registration</h3>
                <p>Submit your information carefully. Access to personal records should be controlled by your registration service and database policies.</p>
              </section>
              <section class="info-card checklist-card">
                <h4>BEFORE YOU SUBMIT</h4>
                <ul><li>Check your email and phone number.</li><li>Enter the correct CNIC or B-Form.</li><li>Confirm your selected course and batch.</li></ul>
              </section>
            </aside>
          </div>

          <footer class="page-footer">EDUCORE · STUDENT ADMISSION PORTAL</footer>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: #0f172a;
      color-scheme: light;
    }

    * { box-sizing: border-box; }

    /* Login page jaisa: white se light blue gradient */
    .register-page {
      width: 100%;
      min-height: 100dvh;
      background: linear-gradient(120deg, #ffffff 0%, #eef5fb 45%, #d6e6f4 100%);
    }

    /* ================= DARK NAVBAR ================= */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      height: 76px;
      background: #020617;
      border-bottom: 1px solid rgb(255 255 255 / 10%);
      box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
    }

    .topbar-inner {
      width: min(100% - 40px, 1280px);
      height: 100%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; min-width: 0; }
    .brand-icon {
      display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 auto;
      border-radius: 14px; background: #2563eb; color: white;
      box-shadow: 0 6px 18px rgb(37 99 235 / 35%);
    }
    .brand-icon svg { width: 22px; height: 22px; }
    .brand-copy { display: flex; flex-direction: column; gap: 3px; }
    .brand-copy strong { font-size: 19px; line-height: 1; font-weight: 900; letter-spacing: -.04em; color: #ffffff; }
    .brand-copy small { font-size: 8px; font-weight: 800; letter-spacing: .19em; color: #60a5fa; white-space: nowrap; }
    .home-link {
      display: inline-flex; align-items: center; gap: 7px; padding: 10px 14px;
      border: 1px solid rgb(255 255 255 / 15%); border-radius: 11px; color: #cbd5e1;
      background: rgb(255 255 255 / 5%);
      text-decoration: none; font-size: 11px; font-weight: 800; white-space: nowrap;
      transition: .2s ease;
    }
    .home-link:hover { color: white; background: #2563eb; border-color: #2563eb; }
    .home-link svg { width: 15px; height: 15px; }

    /* ================= WORKSPACE (LIGHT) ================= */
    .workspace { position: relative; isolation: isolate; background: transparent; overflow: hidden; }
    .ambient { position: absolute; z-index: -1; pointer-events: none; width: 360px; height: 360px; border-radius: 50%; filter: blur(80px); opacity: .55; }
    .ambient-one { top: -120px; right: -100px; background: #bfdbfe; }
    .ambient-two { bottom: -120px; left: -100px; background: #c7d2fe; }
    .workspace-inner { position: relative; width: min(100% - 40px, 1280px); margin: 0 auto; padding: 30px 0 18px; }

    .page-heading { text-align: center; margin: 0 auto 27px; }
    .admission-badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px;
      border: 1px solid #bfdbfe; border-radius: 999px; background: #ffffff; color: #1d4ed8;
      box-shadow: 0 2px 6px rgb(15 23 42 / 6%); font-size: 9px; font-weight: 900; letter-spacing: .19em;
    }
    .admission-badge i, .new-admission i { width: 6px; height: 6px; border-radius: 50%; background: #2563eb; }
    .page-heading h1 { margin: 15px 0 7px; font-size: clamp(30px, 3vw, 43px); line-height: 1.12; letter-spacing: -.055em; font-weight: 950; color: #020617; }
    .page-heading h1 span { color: #1d4ed8; }
    .page-heading > p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.7; }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, .88fr) minmax(0, 1.8fr) minmax(0, .88fr);
      gap: 22px;
      align-items: start;
    }
    .side-column { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

    /* ================= SIDE CARDS ================= */
    .guide-card { padding: 22px; border-radius: 17px; background: #020617; color: white; box-shadow: 0 14px 30px rgb(15 23 42 / 18%); }
    .mini-icon { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid #ffffff20; border-radius: 12px; background: #ffffff12; color: #93c5fd; }
    .mini-icon svg { width: 19px; height: 19px; }
    .guide-card h2 { margin: 16px 0 5px; font-size: 15px; font-weight: 900; letter-spacing: -.02em; }
    .guide-card > p { margin: 0; font-size: 11px; line-height: 1.7; }
    .muted-on-dark { color: #94a3b8; }
    .guide-steps { display: flex; flex-direction: column; gap: 17px; margin-top: 21px; }
    .guide-step { display: flex; align-items: flex-start; gap: 10px; }
    .step-number { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border-radius: 10px; background: #ffffff12; color: #93c5fd; font-size: 10px; }
    .step-number.active { color: white; background: #2563eb; }
    .guide-step strong { display: block; padding-top: 2px; font-size: 11px; line-height: 1.4; }
    .guide-step small { display: block; margin-top: 4px; color: #94a3b8; font-size: 10px; line-height: 1.5; }

    .info-card { padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 6px 18px rgb(15 23 42 / 6%); min-width: 0; }
    .info-title { display: flex; align-items: center; gap: 10px; }
    .info-icon { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex: 0 0 auto; }
    .info-icon svg { width: 21px; height: 21px; }
    .blue-icon { background: #eff6ff; color: #2563eb; font-size: 22px; font-weight: 700; }
    .green-icon { background: #ecfdf5; color: #059669; }
    .info-card h3 { margin: 0; color: #0f172a; font-size: 12px; font-weight: 900; }
    .info-title p { margin: 4px 0 0; color: #94a3b8; font-size: 10px; }
    .info-card > p { margin: 12px 0 0; color: #64748b; font-size: 10.5px; line-height: 1.75; }
    .info-card > .green-icon { margin-bottom: 12px; }
    .checklist-card h4 { margin: 0; color: #1d4ed8; font-size: 9px; font-weight: 900; letter-spacing: .17em; }
    .checklist-card ul { display: grid; gap: 11px; margin: 14px 0 0; padding: 0; list-style: none; }
    .checklist-card li { position: relative; padding-left: 17px; color: #64748b; font-size: 10.5px; line-height: 1.55; }
    .checklist-card li::before { content: '✓'; position: absolute; left: 0; top: 0; color: #2563eb; font-weight: 900; }

    /* ================= FORM CARD (WHITE) ================= */
    .form-card { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 24px; background: #ffffff; box-shadow: 0 20px 50px rgb(15 23 42 / 10%); }
    .form-card-header { position: relative; isolation: isolate; flex: 0 0 auto; overflow: hidden; padding: 22px 26px 23px; background: #ffffff; border-bottom: 1px solid #eef2f7; color: #020617; }
    .header-decoration { position: absolute; z-index: -1; width: 150px; height: 150px; top: -80px; right: -5px; border: 25px solid rgb(37 99 235 / 8%); border-radius: 50%; }
    .new-admission { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 7px; background: #eff6ff; color: #1d4ed8; font-size: 8px; font-weight: 900; letter-spacing: .17em; }
    .new-admission i { width: 5px; height: 5px; background: #2563eb; }
    .form-card-header h2 { margin: 13px 0 5px; font-size: clamp(21px, 2vw, 27px); line-height: 1.2; font-weight: 950; letter-spacing: -.04em; color: #020617; }
    .form-card-header > p { margin: 0; color: #64748b; font-size: 10.5px; line-height: 1.7; }
    .header-user-icon { position: absolute; top: 23px; right: 25px; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #e2e8f0; border-radius: 13px; background: #f8fafc; color: #2563eb; }
    .header-user-icon svg { width: 24px; height: 24px; }

    .registration-form { display: flex; flex-direction: column; gap: 27px; min-width: 0; padding: 25px 26px 28px; background: #ffffff; }
    .form-section { display: flex; flex-direction: column; gap: 17px; min-width: 0; }
    .section-heading { display: flex; align-items: center; gap: 11px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
    .section-heading > b { display: grid; place-items: center; width: 31px; height: 31px; flex: 0 0 31px; border-radius: 10px; background: #020617; color: white; font-size: 11px; }
    .section-heading h3 { margin: 0; color: #020617; font-size: 12px; font-weight: 900; }
    .section-heading p { margin: 4px 0 0; color: #94a3b8; font-size: 10px; }
    .field { min-width: 0; }
    .field label { display: block; margin-bottom: 7px; color: #0f172a; font-size: 10.5px; font-weight: 800; }
    .field label em { color: #2563eb; font-style: normal; }
    .optional { color: #94a3b8; font-weight: 500; }
    .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; min-width: 0; }

    /* Login page jaise rounded white inputs */
    .form-input { display: block; width: 100%; min-width: 0; min-height: 46px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; padding: 0 14px; color: #0f172a; font-family: inherit; font-size: 11.5px; font-weight: 500; line-height: 1.5; outline: none; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
    .form-input::placeholder { color: #94a3b8; font-weight: 400; }
    .form-input:hover { border-color: #cbd5e1; }
    .form-input:focus { border-color: #2563eb; background: #ffffff; box-shadow: 0 0 0 3px rgb(37 99 235 / 12%); }
    .form-input:disabled { cursor: not-allowed; opacity: .55; background: #f8fafc; }
    select.form-input { cursor: pointer; }
    .textarea { min-height: 90px; padding: 12px 14px; resize: vertical; }

    .field-hint { margin: 7px 0 0; font-size: 10px; }
    .error-hint { color: #e11d48; }
    .warning-hint { color: #d97706; }
    .loading-note { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #dbeafe; border-radius: 12px; background: #eff6ff; color: #1d4ed8; font-size: 10px; font-weight: 700; }
    .spinner { display: inline-block; width: 17px; height: 17px; flex: 0 0 auto; border: 2px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
    .button-spinner { border-color: white; border-top-color: transparent; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .privacy-note { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; }
    .privacy-lock { color: #1d4ed8; font-size: 18px; line-height: 1.2; }
    .privacy-note strong { display: block; color: #334155; font-size: 10.5px; font-weight: 900; }
    .privacy-note p { margin: 5px 0 0; color: #64748b; font-size: 10px; line-height: 1.65; }

    /* Login page ke Sign In button jaisa */
    .submit-button { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 50px; padding: 12px 18px; border: 0; border-radius: 14px; background: #0f172a; color: white; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 8px 18px rgb(15 23 42 / 18%); transition: background .2s ease, transform .2s ease; }
    .submit-button:hover:not(:disabled) { background: #1d4ed8; }
    .submit-button:hover:not(:disabled) span:last-child { transform: translateX(3px); }
    .submit-button:active:not(:disabled) { transform: scale(.99); }
    .submit-button:disabled { cursor: not-allowed; opacity: .5; box-shadow: none; }
    .submit-button span:last-child { font-size: 17px; transition: transform .2s ease; }
    .login-prompt { margin: -12px 0 0; text-align: center; color: #64748b; font-size: 10.5px; }
    .login-prompt a { color: #1d4ed8; font-weight: 900; text-decoration: none; cursor: pointer; }
    .login-prompt a:hover { color: #020617; text-decoration: underline; }
    .page-footer { padding-top: 17px; text-align: center; color: #94a3b8; font-size: 9px; font-weight: 700; letter-spacing: .13em; }

    button:focus-visible, a:focus-visible { outline: 3px solid rgb(37 99 235 / 35%); outline-offset: 3px; }

    @media (min-width: 1440px) {
      .workspace-inner { width: min(100% - 64px, 1400px); }
      .layout-grid { gap: 26px; }
      .guide-card { padding: 25px; }
      .info-card { padding: 21px; }
      .registration-form { padding: 30px 32px; }
      .form-input { min-height: 48px; font-size: 12px; }
      .field label { font-size: 11px; }
    }

    /* Tablet and mobile: single column. */
    @media (max-width: 1023px) {
      .workspace-inner { width: min(100% - 40px, 760px); padding: 28px 0 20px; }
      .page-heading { margin-bottom: 25px; }
      .layout-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
      .registration-form { padding: 25px; }
      .left-column { order: 2; }
      .form-card { order: 1; }
      .right-column { order: 3; }
    }

    @media (min-width: 640px) and (max-width: 1023px) {
      .left-column { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: stretch; }
      .right-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
    }

    @media (max-width: 639px) {
      .topbar { height: 68px; }
      .topbar-inner { width: calc(100% - 28px); gap: 8px; }
      .brand { gap: 9px; }
      .brand-icon { width: 38px; height: 38px; border-radius: 12px; }
      .brand-copy strong { font-size: 17px; }
      .brand-copy small { font-size: 7px; letter-spacing: .11em; }
      .home-link { gap: 4px; padding: 9px 9px; font-size: 10px; }
      .workspace-inner { width: calc(100% - 28px); padding-top: 23px; }
      .page-heading { margin-bottom: 22px; }
      .page-heading h1 { font-size: clamp(28px, 8vw, 36px); }
      .page-heading > p { font-size: 12px; }
      .admission-badge { font-size: 8px; letter-spacing: .14em; }
      .form-card { border-radius: 18px; }
      .form-card-header { padding: 20px 17px; }
      .form-card-header h2 { font-size: 22px; }
      .form-card-header > p { max-width: 85%; }
      .header-user-icon { top: 19px; right: 15px; width: 36px; height: 36px; }
      .header-user-icon svg { width: 20px; height: 20px; }
      .registration-form { padding: 20px 16px 22px; gap: 25px; }
      .form-section { gap: 15px; }
      .field-grid { grid-template-columns: minmax(0, 1fr); gap: 15px; }
      .form-input { min-height: 48px; font-size: 13px; }
      .textarea { min-height: 95px; }
      .guide-card { padding: 20px; }
      .info-card { padding: 17px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
  `],
})
export class StudentRegisterComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(Toast);

  readonly courses = signal<CatalogItem[]>([]);
  readonly batches = signal<CatalogItem[]>([]);
  readonly catalogLoading = signal(true);
  readonly saving = signal(false);
  readonly registered = signal(false);

  fullName = '';
  email = '';
  studentPhone = '';
  studentCnic = '';
  address = '';
  lastEducation = '';
  laptopAvailable: '' | 'yes' | 'no' = '';
  fatherName = '';
  fatherPhone = '';
  fatherCnic = '';
  fatherOccupation = '';
  selectedCourse = '';
  selectedBatch = '';

  get availableBatches(): CatalogItem[] {
    if (!this.selectedCourse) return [];
    return this.batches().filter(batch => batch.courseId === this.selectedCourse);
  }

  async ngOnInit(): Promise<void> {
    await this.loadCatalogs();
  }

  /** Sirf digits allow karta hai aur max length se zyada nahi jane deta. */
  setDigits(
    field: 'studentPhone' | 'fatherPhone' | 'studentCnic' | 'fatherCnic',
    raw: string,
    max: number,
  ): void {
    const cleaned = (raw ?? '').replace(/\D/g, '').slice(0, max);
    this[field] = raw;
    if (cleaned !== raw) {
      queueMicrotask(() => { this[field] = cleaned; });
    }
  }

  private friendlyError(message: string): { title: string; text: string } {
    const m = message.toLowerCase();
    if (m.includes('email')) {
      return { title: 'Already Registered', text: 'This email address is already registered. Please use a different email or log in to your student account.' };
    }
    if (m.includes('cnic')) {
      return { title: 'Already Registered', text: 'This CNIC / B-Form number is already registered.' };
    }
    if (m.includes('phone')) {
      return { title: 'Already Registered', text: 'This phone number is already registered.' };
    }
    if (m.includes('duplicate key') || m.includes('unique constraint') || m.includes('already')) {
      return { title: 'Already Registered', text: 'A student with these details is already registered.' };
    }
    return { title: 'Registration Failed', text: message || 'Registration failed. Please try again.' };
  }

  private async loadCatalogs(): Promise<void> {
    this.catalogLoading.set(true);
    try {
      const [courseResult, batchResult] = await Promise.all([
        this.supabase.client.from('courses').select('*'),
        this.supabase.client.from('course_batches').select('*'),
      ]);

      if (courseResult.error) throw courseResult.error;
      if (batchResult.error) throw batchResult.error;

      const courseRows = (courseResult.data ?? []) as DbRow[];
      const batchRows = (batchResult.data ?? []) as DbRow[];

      const courses: CatalogItem[] = courseRows
        .map(row => ({
          id: this.readValue(row, ['course_id', 'id']),
          name: this.readValue(row, ['course_name', 'course_title', 'title', 'name']),
        }))
        .filter(item => item.id !== '' && item.name !== '');

      const batches: CatalogItem[] = batchRows
        .map(row => ({
          id: this.readValue(row, ['course_batch_id', 'batch_id', 'id']),
          name: this.readValue(row, ['batch_name', 'course_batch_name', 'batch_title', 'title', 'name']),
          courseId: this.readValue(row, ['course_id', 'courseId']),
        }))
        .filter(item => item.id !== '' && item.name !== '' && item.courseId !== '');

      this.courses.set(courses);
      this.batches.set(batches);

      if (courses.length === 0) {
        this.toast.warning('No courses were found.', 'Courses Unavailable');
      }
    } catch (error: unknown) {
      this.toast.error(
        error instanceof Error
          ? `Unable to load courses: ${error.message}`
          : 'Unable to load courses and batches.',
        'Catalog Error',
      );
    } finally {
      this.catalogLoading.set(false);
    }
  }

  onCourseChange(): void {
    this.selectedBatch = '';
  }

  async registerStudent(): Promise<void> {
    if (this.saving() || this.registered()) return;

    const fullName = this.fullName.trim();
    const email = this.email.trim().toLowerCase();
    const studentPhone = this.studentPhone.trim();
    const studentCnic = this.normalizeCnic(this.studentCnic);
    const address = this.address.trim();
    const lastEducation = this.lastEducation.trim();
    const fatherName = this.fatherName.trim();
    const fatherPhone = this.fatherPhone.trim();
    const fatherCnic = this.fatherCnic.trim()
      ? this.normalizeCnic(this.fatherCnic)
      : null;
    const fatherOccupation = this.fatherOccupation.trim() || null;

    if (
      !fullName || !email || !studentPhone || !studentCnic ||
      !address || !lastEducation || !this.laptopAvailable ||
      !fatherName || !fatherPhone || !this.selectedCourse ||
      !this.selectedBatch
    ) {
      this.toast.warning('Please complete all required fields.', 'Missing Information');
      return;
    }

    const phoneDigits = (v: string) => v.replace(/\D/g, '');
    if (phoneDigits(studentPhone).length !== 11 || phoneDigits(fatherPhone).length !== 11) {
      this.toast.warning('Phone number must be exactly 11 digits.', 'Invalid Phone Number');
      return;
    }

    if (studentCnic.length !== 13) {
      this.toast.warning('Please enter a valid 13-digit CNIC or B-Form.', 'Invalid CNIC');
      return;
    }

    if (fatherCnic && fatherCnic.length !== 13) {
      this.toast.warning('Please enter a valid guardian CNIC or leave it empty.', 'Invalid Guardian CNIC');
      return;
    }

    this.saving.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke('register-student', {
        body: {
          fullName,
          email,
          studentPhone,
          studentCnic,
          address,
          lastEducation,
          laptopAvailable: this.laptopAvailable === 'yes',
          fatherName,
          fatherPhone,
          fatherCnic,
          fatherOccupation,
          courseId: this.selectedCourse,
          batchId: this.selectedBatch,
        },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const details = await error.context.json().catch(() => null);
          throw new Error(
            details?.error ?? details?.message ?? 'Registration function returned an error.',
          );
        }
        if (error instanceof FunctionsFetchError) {
          console.error('Edge Function fetch error:', error);
          throw new Error(
            'Server se connect nahi ho paya. Edge Function deployment, CORS aur environment settings check karein.',
          );
        }
        throw new Error(error.message);
      }

      if (data?.error) throw new Error(data.error);

      this.registered.set(true);
      this.toast.success(data?.message ?? 'Registration completed successfully.', 'Application Submitted');
    } catch (error: unknown) {
      const friendly = this.friendlyError(error instanceof Error ? error.message : '');
      this.toast.error(friendly.text, friendly.title);
    } finally {
      this.saving.set(false);
    }
  }

  private normalizeCnic(value: string): string {
    return value.replace(/\D/g, '');
  }

  private readValue(row: DbRow, keys: string[]): string {
    for (const key of keys) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }
}