import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

const HERO_VIDEO = '/hero.mp4';

const HERO_POSTER =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=80';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="min-h-screen overflow-x-hidden bg-slate-950 text-white">

      <!-- ================= DARK NAVBAR ================= -->
      <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950 shadow-lg shadow-black/30">

        <nav class="mx-auto flex min-h-[82px] max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">

          <!-- LOGO -->
          <a routerLink="/" class="flex shrink-0 items-center gap-3">

            <div class="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500">

              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"/>
                <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5"/>
                <path d="M21.5 9v6"/>
              </svg>

            </div>

            <span class="font-serif text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Edu<span class="text-blue-400">Core</span>
            </span>

          </a>


          <!-- NAVIGATION LINKS -->
          <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6 lg:gap-x-8">

            <a href="#features"
               class="text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-blue-400">
              Features
            </a>

            <a href="#portals"
               class="text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-blue-400">
              Portals
            </a>

            <a routerLink="/student/register"
               class="text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-blue-400">
              Register
            </a>

            <a routerLink="/student-login"
               class="text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-blue-400">
              Student Login
            </a>

          </div>


          <!-- ADMIN LOGIN -->
          <a routerLink="/admin/login"
             class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500 sm:px-5">

            Admin Login

            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/>
              <path d="m13 6 6 6-6 6"/>
            </svg>

          </a>

        </nav>

      </header>


      <!-- ================= HERO SECTION ================= -->
      <section class="relative isolate flex min-h-[780px] flex-col overflow-hidden bg-slate-950 text-white sm:min-h-[820px] lg:min-h-[850px]">

        <!-- HERO VIDEO
             File location: public/hero.mp4
             Always muted (voice completely off)
             Autoplay + loop = background video
        -->
        <video
          #heroVideoEl
          class="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          autoplay
          [muted]="true"
          [defaultMuted]="true"
          loop
          playsinline
          preload="auto"
          [attr.poster]="heroPoster"
        >
          <source [src]="heroVideo" type="video/mp4"/>
          Your browser does not support video playback.
        </video>


        <!-- DARK OVERLAY: VIDEO VISIBLE + TEXT READABLE -->
        <div class="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/30"></div>

        <!-- BOTTOM GRADIENT -->
        <div class="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-slate-950/85 to-transparent"></div>

        <!-- BLUE GLOW -->
        <div class="pointer-events-none absolute -left-24 top-20 -z-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl"></div>

        <div class="pointer-events-none absolute bottom-20 right-0 -z-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"></div>


        <!-- HERO CONTENT -->
        <div class="mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-20 sm:px-8 lg:px-10">

          <div class="max-w-3xl">

            <!-- BADGE -->
            <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 backdrop-blur-md">

              <span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>

              The Smart Way To Learn

            </div>


            <!-- HEADING -->
            <h1 class="mt-7 font-serif text-5xl font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">

              Education

              <br/>

              <span class="bg-gradient-to-r from-blue-500 via-blue-400 to-sky-300 bg-clip-text text-transparent">
                Without Limits
              </span>

            </h1>


            <!-- DESCRIPTION -->
            <p class="mt-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">

              Attend immersive live classes, stream recorded lectures, attempt interactive quizzes, submit assignments, and track your academic progress all in one place.

            </p>


            <!-- BUTTONS -->
            <div class="mt-8 flex flex-wrap items-center gap-4">

              <a routerLink="/student/register"
                 class="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-xl shadow-blue-600/30 transition hover:-translate-y-0.5 hover:bg-blue-500 sm:px-8">

                Register Now

                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>

              </a>


              <a routerLink="/student-login"
                 class="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-7 py-3 text-sm font-extrabold uppercase tracking-wider text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-8">

                Student Login

              </a>

            </div>


            <!-- TRUST POINTS -->
            <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-200">

              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="m5 12 4 4L19 6"/>
                </svg>
                Easy Learning
              </span>

              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="m5 12 4 4L19 6"/>
                </svg>
                Online Classes
              </span>

              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="m5 12 4 4L19 6"/>
                </svg>
                Track Progress
              </span>

            </div>

          </div>

        </div>


        <!-- ================= HERO FEATURE CARDS: DARK ================= -->
        <div class="relative z-10 mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">

          <div class="grid overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40 backdrop-blur-md md:grid-cols-3 md:divide-x md:divide-white/10">

            <!-- RECORDED LECTURES -->
            <a routerLink="/student-login"
               class="group flex items-center gap-5 p-6 transition hover:bg-slate-800 sm:p-8">

              <div class="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="3"/>
                  <path d="m10 9 5 3-5 3z"/>
                </svg>

              </div>

              <div>
                <h3 class="font-serif text-lg font-bold uppercase leading-tight text-white transition group-hover:text-blue-400">
                  Recorded Lectures
                </h3>
                <p class="mt-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  Watch now →
                </p>
              </div>

            </a>


            <!-- LIVE CLASSES -->
            <a routerLink="/student-login"
               class="group flex items-center gap-5 p-6 transition hover:bg-slate-800 sm:p-8">

              <div class="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>

              </div>

              <div>
                <h3 class="font-serif text-lg font-bold uppercase leading-tight text-white transition group-hover:text-blue-400">
                  Live Classes
                </h3>
                <p class="mt-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  Join class →
                </p>
              </div>

            </a>


            <!-- QUIZZES -->
            <a routerLink="/student-login"
               class="group flex items-center gap-5 p-6 transition hover:bg-slate-800 sm:p-8">

              <div class="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2"/>
                  <path d="m8.5 9 1.5 1.5L13 7.5"/>
                  <path d="M8 14h8"/>
                  <path d="M8 17.5h5"/>
                </svg>

              </div>

              <div>
                <h3 class="font-serif text-lg font-bold uppercase leading-tight text-white transition group-hover:text-blue-400">
                  Quizzes & Results
                </h3>
                <p class="mt-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  View more →
                </p>
              </div>

            </a>

          </div>

        </div>

      </section>


      <!-- ================= FEATURES SECTION: DARK ================= -->
      <section id="features" class="scroll-mt-24 border-t border-white/10 bg-slate-900 py-20 sm:py-28">

        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <!-- SECTION HEADER -->
          <div class="mx-auto max-w-2xl text-center">

            <span class="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-400">
              Platform Capabilities
            </span>

            <h2 class="mt-3 font-serif text-3xl font-extrabold text-white sm:text-4xl">
              Everything You Need to Excel
            </h2>

            <p class="mt-4 text-base leading-7 text-slate-400">
              A modern learning environment designed for academic success.
            </p>

          </div>


          <!-- FEATURE GRID -->
          <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            <!-- COURSES -->
            <article class="group rounded-2xl border border-white/10 bg-slate-950 p-7 text-center shadow-lg shadow-black/20 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-600/10">

              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
                </svg>

              </div>

              <h3 class="mt-5 text-base font-bold text-white">
                Courses &amp; Batches
              </h3>

              <p class="mt-2.5 text-sm leading-relaxed text-slate-400">
                Content organized by your enrolled course and batch.
              </p>

            </article>


            <!-- QUIZZES -->
            <article class="group rounded-2xl border border-white/10 bg-slate-950 p-7 text-center shadow-lg shadow-black/20 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-600/10">

              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2"/>
                  <path d="M8 8h8"/>
                  <path d="M8 12h8"/>
                  <path d="M8 16h5"/>
                </svg>

              </div>

              <h3 class="mt-5 text-base font-bold text-white">
                Quizzes &amp; Assignments
              </h3>

              <p class="mt-2.5 text-sm leading-relaxed text-slate-400">
                Attempt tests, upload assignments, and review results.
              </p>

            </article>


            <!-- ANNOUNCEMENTS -->
            <article class="group rounded-2xl border border-white/10 bg-slate-950 p-7 text-center shadow-lg shadow-black/20 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-600/10">

              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                  <path d="M10 21h4"/>
                </svg>

              </div>

              <h3 class="mt-5 text-base font-bold text-white">
                Announcements
              </h3>

              <p class="mt-2.5 text-sm leading-relaxed text-slate-400">
                Stay updated with important learning notifications.
              </p>

            </article>


            <!-- PROGRESS -->
            <article class="group rounded-2xl border border-white/10 bg-slate-950 p-7 text-center shadow-lg shadow-black/20 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-600/10">

              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">

                <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19V5"/>
                  <path d="M4 19h17"/>
                  <path d="m8 15 4-4 3 3 5-7"/>
                </svg>

              </div>

              <h3 class="mt-5 text-base font-bold text-white">
                Progress Tracking
              </h3>

              <p class="mt-2.5 text-sm leading-relaxed text-slate-400">
                Monitor scores, results, and academic performance.
              </p>

            </article>

          </div>

        </div>

      </section>


      <!-- ================= PORTALS SECTION: DARK ================= -->
      <section id="portals" class="scroll-mt-24 border-t border-white/10 bg-slate-950 py-20 sm:py-28">

        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <!-- SECTION HEADER -->
          <div class="mx-auto max-w-2xl text-center">

            <span class="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-400">
              Get Started
            </span>

            <h2 class="mt-3 font-serif text-3xl font-extrabold text-white sm:text-4xl">
              Choose Your Portal
            </h2>

            <p class="mt-4 text-base leading-7 text-slate-400">
              Select your role to access your dedicated workspace.
            </p>

          </div>


          <!-- PORTAL GRID -->
          <div class="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2">

            <!-- ADMIN PORTAL -->
            <article class="flex flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-white shadow-xl shadow-black/30 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-600/10">

              <span class="w-fit rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-300">
                Administration
              </span>

              <h3 class="mt-6 font-serif text-2xl font-bold text-white">
                Admin Portal
              </h3>

              <p class="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                Manage system-wide courses, batches, students, quizzes, announcements, and configurations securely.
              </p>

              <a routerLink="/admin/login"
                 class="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500">

                Continue as Admin

                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m13 6 6 6-6 6"/>
                </svg>

              </a>

            </article>


            <!-- STUDENT PORTAL -->
            <article class="flex flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-white shadow-xl shadow-black/30 transition hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-600/10">

              <span class="w-fit rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-300">
                Learning Center
              </span>

              <h3 class="mt-6 font-serif text-2xl font-bold text-white">
                Student Portal
              </h3>

              <p class="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                Access video lectures, join live classes, attempt quizzes, complete assignments, and track your results.
              </p>

              <div class="mt-8 grid gap-3 sm:grid-cols-2">

                <a routerLink="/student-login"
                   class="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500">
                  Student Login
                </a>

                <a routerLink="/student/register"
                   class="inline-flex h-12 items-center justify-center rounded-xl border border-blue-400/40 bg-transparent px-4 text-sm font-bold text-blue-300 transition hover:bg-blue-600 hover:text-white">
                  Register
                </a>

              </div>

            </article>

          </div>

        </div>

      </section>


      <!-- ================= FOOTER: DARK ================= -->
      <footer class="border-t border-white/10 bg-slate-900 text-white">

        <div class="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">

          <!-- LOGO -->
          <a routerLink="/" class="flex items-center gap-3">

            <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">

              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"/>
                <path d="M6.5 11v5c3.3 2.6 7.7 2.6 11 0v-5"/>
                <path d="M21.5 9v6"/>
              </svg>

            </div>

            <span class="font-serif text-xl font-bold text-white">
              Edu<span class="text-blue-400">Core</span>
            </span>

          </a>


          <!-- COPYRIGHT -->
          <p class="text-xs font-semibold tracking-wide text-slate-400">
            &copy; 2026 EduCore. All rights reserved.
          </p>


          <!-- FOOTER LINKS -->
          <div class="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-300">

            <a routerLink="/student-login" class="transition hover:text-blue-400">
              Student Login
            </a>

            <a routerLink="/admin/login" class="transition hover:text-blue-400">
              Admin Login
            </a>

          </div>

        </div>

      </footer>

    </main>
  `,
})
export class HomeComponent implements AfterViewInit {

  // Video path: public/hero.mp4
  readonly heroVideo = HERO_VIDEO;

  // Poster shown while the video loads
  readonly heroPoster = HERO_POSTER;

  @ViewChild('heroVideoEl') private heroVideoEl?: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    const video = this.heroVideoEl?.nativeElement;
    if (!video) return;

    // Video ko hamesha mute rakho
    video.muted = true;
    video.volume = 0;
    video.play().catch(() => {});
  }

}