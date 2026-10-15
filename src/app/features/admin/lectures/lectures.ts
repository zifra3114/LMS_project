
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course, CourseBatch, CourseService } from '../../../core/services/course.service';
import {
  Lecture,
  LectureInput,
  LectureService,
  LectureStatus,
  UploadProgress,
  formatBytes,
  formatDuration,
} from '../../../core/services/lecture.service';
import { Toast } from '../../../core/services/toast.service';
import { ActionButtonsComponent } from '../../../shared/components/action-buttons/action-buttons';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player';

type StatusFilter = 'All' | LectureStatus;

@Component({
  selector: 'app-lectures',
  standalone: true,
  imports: [FormsModule, ActionButtonsComponent, VideoPlayerComponent],
  template: `
    <div class="space-y-6 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Lectures</h1>
          <p class="text-sm text-slate-500">
            Upload recorded lectures for a batch. Only students of that batch can watch them.
          </p>
        </div>
        <button
          type="button"
          (click)="openCreate()"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + New Lecture
        </button>
      </div>

      <!-- Overview cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">Total lectures</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ lectures().length }}</p>
          <p class="mt-1 text-xs text-slate-400">All uploaded lecture records</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">Published</p>
          <p class="mt-2 text-2xl font-bold text-emerald-600">{{ countStatus('Published') }}</p>
          <p class="mt-1 text-xs text-slate-400">Visible to students</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">Drafted</p>
          <p class="mt-2 text-2xl font-bold text-amber-600">{{ countStatus('Drafted') }}</p>
          <p class="mt-1 text-xs text-slate-400">Not visible to students</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">Videos ready</p>
          <p class="mt-2 text-2xl font-bold text-blue-600">{{ countProcessing('Ready') }}</p>
          <p class="mt-1 text-xs text-slate-400">Ready to play in admin preview</p>
        </div>
      </div>

      <!-- Filters and view switch -->
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex flex-wrap items-center gap-5 border-b border-slate-100 xl:border-0">
            <button
              type="button"
              (click)="statusFilter.set('All')"
              class="border-b-2 px-1 pb-3 text-sm font-semibold xl:pb-1"
              [class.border-blue-600]="statusFilter() === 'All'"
              [class.text-blue-700]="statusFilter() === 'All'"
              [class.border-transparent]="statusFilter() !== 'All'"
              [class.text-slate-500]="statusFilter() !== 'All'"
            >
              All Lectures
              <span class="ml-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                {{ lectures().length }}
              </span>
            </button>

            <button
              type="button"
              (click)="statusFilter.set('Published')"
              class="border-b-2 px-1 pb-3 text-sm font-semibold xl:pb-1"
              [class.border-blue-600]="statusFilter() === 'Published'"
              [class.text-blue-700]="statusFilter() === 'Published'"
              [class.border-transparent]="statusFilter() !== 'Published'"
              [class.text-slate-500]="statusFilter() !== 'Published'"
            >
              Published
              <span class="ml-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                {{ countStatus('Published') }}
              </span>
            </button>

            <button
              type="button"
              (click)="statusFilter.set('Drafted')"
              class="border-b-2 px-1 pb-3 text-sm font-semibold xl:pb-1"
              [class.border-blue-600]="statusFilter() === 'Drafted'"
              [class.text-blue-700]="statusFilter() === 'Drafted'"
              [class.border-transparent]="statusFilter() !== 'Drafted'"
              [class.text-slate-500]="statusFilter() !== 'Drafted'"
            >
              Drafted
              <span class="ml-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                {{ countStatus('Drafted') }}
              </span>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search lectures by title…"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              class="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <select
              [ngModel]="batchFilter()"
              (ngModelChange)="batchFilter.set(+$event)"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option [ngValue]="0">All Batches</option>
              @for (b of batches(); track b.id) {
                <option [ngValue]="b.id">{{ batchLabel(b.id) }}</option>
              }
            </select>

            <div class="flex rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                (click)="viewMode.set('grid')"
                aria-label="Grid view"
                class="rounded-md p-2"
                [class.bg-blue-600]="viewMode() === 'grid'"
                [class.text-white]="viewMode() === 'grid'"
                [class.text-slate-500]="viewMode() !== 'grid'"
                title="Grid view"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>

              <button
                type="button"
                (click)="viewMode.set('list')"
                aria-label="List view"
                class="rounded-md p-2"
                [class.bg-blue-600]="viewMode() === 'list'"
                [class.text-white]="viewMode() === 'list'"
                [class.text-slate-500]="viewMode() !== 'list'"
                title="List view"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 6h13M8 12h13M8 18h13"/>
                  <path d="M3 6h.01M3 12h.01M3 18h.01" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading lectures…
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p class="font-semibold text-slate-700">No lectures found</p>
          <p class="mt-1 text-sm text-slate-500">Try another search or status filter.</p>
        </div>
      } @else if (viewMode() === 'grid') {
        <!-- Grid / Card view: video remains here -->
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          @for (l of filtered(); track l.id) {
            <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div class="relative flex aspect-video items-center justify-center overflow-hidden bg-slate-950">
                @if (l.processing_status === 'Ready' && !uploads()[l.id]) {
                  <app-video-player [lectureId]="l.id" />
                } @else if (uploads()[l.id]; as u) {
                  <div class="w-full px-6 text-center text-white">
                    <div class="mb-2 text-sm font-semibold">Uploading {{ percent(u) }}%</div>
                    <div class="h-2 overflow-hidden rounded-full bg-white/20">
                      <div class="h-full bg-blue-400" [style.width.%]="percent(u)"></div>
                    </div>
                    <button
                      type="button"
                      (click)="cancelUpload(l.id)"
                      class="mt-3 text-xs font-semibold text-red-200 underline"
                    >
                      Cancel upload
                    </button>
                  </div>
                } @else {
                  <div class="px-5 text-center text-white">
                    <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl">▶</div>
                    <p class="text-sm font-semibold">
                      {{ l.processing_status === 'Processing'
                        ? 'Video processing'
                        : l.processing_status === 'Failed'
                          ? 'Video processing failed'
                          : 'Video not uploaded yet' }}
                    </p>
                    @if (l.processing_status === 'Processing') {
                      <p class="mt-1 text-xs text-slate-300">{{ l.processing_progress }}% complete</p>
                    }
                    @if (l.processing_error) {
                      <p class="mt-1 text-xs text-red-200">{{ l.processing_error }}</p>
                    }
                  </div>
                }
              </div>

              <div class="space-y-4 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="truncate text-base font-bold text-slate-900">{{ l.title }}</h2>
                    <p class="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                      {{ l.description || 'No description added.' }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class.bg-emerald-50]="l.status === 'Published'"
                    [class.text-emerald-700]="l.status === 'Published'"
                    [class.bg-amber-50]="l.status !== 'Published'"
                    [class.text-amber-700]="l.status !== 'Published'"
                  >
                    {{ l.status }}
                  </span>
                </div>

                <div class="space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div class="flex justify-between gap-3">
                    <span class="text-slate-500">Course / Batch</span>
                    <span class="text-right font-medium text-slate-700">
                      {{ l.course_batches?.courses?.title || 'Course' }} ·
                      {{ l.course_batches?.batch_name || batchLabel(l.batch_id) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Duration</span>
                    <span class="font-medium text-slate-700">{{ duration(l.duration_minutes) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Video status</span>
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-semibold"
                      [class.bg-emerald-50]="l.processing_status === 'Ready'"
                      [class.text-emerald-700]="l.processing_status === 'Ready'"
                      [class.bg-amber-50]="l.processing_status !== 'Ready'"
                      [class.text-amber-700]="l.processing_status !== 'Ready'"
                    >
                      {{ l.processing_status || 'No video' }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    (click)="viewingId.set(l.id)"
                    [disabled]="l.processing_status !== 'Ready'"
                    class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ▶ Open video
                  </button>

                  <app-action-buttons
                    [showUpload]="true"
                    [uploadLabel]="uploadLabel(l)"
                    [uploadDisabled]="!!uploads()[l.id] || l.processing_status === 'Processing'"
                    [deleteLoading]="deletingId() === l.id"
                    (uploadClick)="pickFile(l.id)"
                    (viewClick)="viewingId.set(l.id)"
                    (editClick)="openEdit(l)"
                    (deleteClick)="deleteTarget.set(l)"
                  />
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <!-- List / Table view: Video column removed -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-[800px] w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Lecture</th>
                <th class="px-4 py-3">Batch</th>
                <th class="px-4 py-3">Duration</th>
                <th class="px-4 py-3">Visibility</th>
                <th class="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              @for (l of filtered(); track l.id) {
                <tr class="align-top hover:bg-slate-50">
                  <td class="max-w-xs px-4 py-3">
                    <div class="font-semibold text-slate-800">{{ l.title }}</div>
                    <p class="mt-1 text-xs leading-5 text-slate-500">
                      {{ l.description || 'No description added.' }}
                    </p>
                  </td>

                  <td class="px-4 py-3 text-slate-600">
                    {{ l.course_batches?.courses?.title || 'Course' }} ·
                    {{ l.course_batches?.batch_name || batchLabel(l.batch_id) }}
                  </td>

                  <td class="px-4 py-3 text-slate-600">
                    {{ duration(l.duration_minutes) }}
                  </td>

                  <td class="px-4 py-3">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold"
                      [class.bg-emerald-50]="l.status === 'Published'"
                      [class.text-emerald-700]="l.status === 'Published'"
                      [class.bg-amber-50]="l.status !== 'Published'"
                      [class.text-amber-700]="l.status !== 'Published'"
                    >
                      {{ l.status }}
                    </span>
                  </td>

                  <td class="px-4 py-3">
                    <app-action-buttons
                      [showUpload]="true"
                      [uploadLabel]="uploadLabel(l)"
                      [uploadDisabled]="!!uploads()[l.id] || l.processing_status === 'Processing'"
                      [deleteLoading]="deletingId() === l.id"
                      (uploadClick)="pickFile(l.id)"
                      (viewClick)="viewingId.set(l.id)"
                      (editClick)="openEdit(l)"
                      (deleteClick)="deleteTarget.set(l)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Hidden file chooser for upload / resume -->
    <input
      #resumeInput
      type="file"
      accept="video/*,.mkv"
      class="hidden"
      (change)="onResumeFile($event)"
    />

    <!-- Create / Edit Modal -->
    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <form
          #f="ngForm"
          (ngSubmit)="save()"
          class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 class="text-lg font-bold text-slate-800">
            {{ editingId() ? 'Edit Lecture' : 'New Lecture' }}
          </h2>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Batch</label>
            <select
              name="batch_id"
              [(ngModel)]="form.batch_id"
              required
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option [ngValue]="0" disabled>Select a batch</option>
              @for (b of batches(); track b.id) {
                <option [ngValue]="b.id">{{ batchLabel(b.id) }}</option>
              }
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Title</label>
            <input
              name="title"
              [(ngModel)]="form.title"
              required
              placeholder="e.g. Lecture 1 - Introduction"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Description (optional)</label>
            <textarea
              name="description"
              [(ngModel)]="form.description"
              rows="2"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              {{ editingId() ? 'Replace video (optional)' : 'Video file' }}
            </label>
            <input
              type="file"
              accept="video/*,.mkv"
              (change)="onFormFile($event)"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-blue-700"
            />

            @if (file(); as chosen) {
              <p class="mt-1 text-xs text-slate-500">{{ chosen.name }} · {{ bytes(chosen.size) }}</p>
            }

            <p class="mt-1 text-xs text-slate-500">
              Videos of 2–4 hours are supported. Please keep this page open while uploading.
              The duration is detected automatically.
            </p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select
              name="status"
              [(ngModel)]="form.status"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Published">Published (visible to students)</option>
              <option value="Drafted">Drafted (hidden for now)</option>
            </select>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              (click)="closeModal()"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="saving() || f.invalid || !form.batch_id || (!editingId() && !file())"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ saving() ? 'Saving…' : editingId() ? 'Update' : 'Create & Upload' }}
            </button>
          </div>
        </form>
      </div>
    }

    <!-- Admin lecture preview -->
    @if (viewing(); as v) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
        (click)="viewingId.set(null)"
      >
        <section
          class="my-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Lecture preview"
          (click)="$event.stopPropagation()"
        >
          <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">Admin preview</p>
              <h2 class="mt-1 break-words text-xl font-bold text-slate-900">{{ v.title }}</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ v.course_batches?.courses?.title || 'Course' }} ·
                {{ v.course_batches?.batch_name || 'Batch' }} ·
                {{ duration(v.duration_minutes) }}
              </p>
            </div>

            <button
              type="button"
              (click)="viewingId.set(null)"
              class="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Close ✕
            </button>
          </header>

          <div class="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
            <div class="min-w-0 bg-slate-950 p-3 sm:p-5">
              @if (v.processing_status === 'Ready') {
                <div class="overflow-hidden rounded-xl bg-black">
                  <app-video-player [lectureId]="v.id" />
                </div>
              } @else {
                <div class="flex aspect-video flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-6 text-center text-white">
                  <span class="mb-3 text-4xl">▶</span>
                  <p class="font-semibold">Video is not ready to play</p>
                  <p class="mt-2 text-sm text-slate-300">
                    Current status: {{ v.processing_status }}
                  </p>
                  @if (v.processing_status === 'Failed' && v.processing_error) {
                    <p class="mt-3 max-w-lg text-sm text-red-300">{{ v.processing_error }}</p>
                  }
                </div>
              }

              <p class="mt-3 text-xs text-slate-400">
                Video preview is available here for administrators once processing is complete.
              </p>
            </div>

            <aside class="space-y-5 p-5 sm:p-6">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Lecture details</h3>
                <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {{ v.description || 'No description has been added for this lecture.' }}
                </p>
              </div>

              <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <span class="text-sm text-slate-500">Visibility</span>
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class]="v.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                  >
                    {{ v.status }}
                  </span>
                </div>

                <div class="flex items-start justify-between gap-3">
                  <span class="text-sm text-slate-500">Video processing</span>
                  <span class="text-right text-sm font-semibold text-slate-800">{{ v.processing_status }}</span>
                </div>

                <div class="flex items-start justify-between gap-3">
                  <span class="text-sm text-slate-500">Duration</span>
                  <span class="text-sm font-semibold text-slate-800">{{ duration(v.duration_minutes) }}</span>
                </div>

                <div class="border-t border-slate-200 pt-3">
                  <p class="text-xs font-medium text-slate-500">Course / batch</p>
                  <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                    {{ v.course_batches?.courses?.title || 'Course' }}
                  </p>
                  <p class="mt-1 text-sm text-slate-600">{{ v.course_batches?.batch_name || 'Batch' }}</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="openEdit(v); viewingId.set(null)"
                  class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit lecture
                </button>

                <button
                  type="button"
                  (click)="viewingId.set(null)"
                  class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    }

    <!-- Delete confirmation -->
    @if (deleteTarget(); as d) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <h2 class="text-lg font-bold text-slate-800">Delete lecture?</h2>
          <p class="text-sm text-slate-600">
            “{{ d.title }}” and its video will be permanently deleted. This cannot be undone.
          </p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              (click)="deleteTarget.set(null)"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              (click)="confirmDelete()"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Lectures implements OnInit, OnDestroy {
  private readonly lectureService = inject(LectureService);
  private readonly courseService = inject(CourseService);
  private readonly toast = inject(Toast);

  readonly lectures = signal<Lecture[]>([]);
  readonly batches = signal<CourseBatch[]>([]);
  readonly courses = signal<Course[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);

  readonly search = signal('');
  readonly batchFilter = signal(0);
  readonly statusFilter = signal<StatusFilter>('All');
  readonly viewMode = signal<'grid' | 'list'>('grid');

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly viewingId = signal<number | null>(null);
  readonly deleteTarget = signal<Lecture | null>(null);
  readonly file = signal<File | null>(null);

  form: LectureInput = this.emptyForm();

  /** Lectures whose video is uploading right now: lecture id -> progress. */
  readonly uploads = signal<Record<number, UploadProgress>>({});
  private readonly speeds = signal<Record<number, { bytesPerSecond: number; at: number; sent: number }>>({});
  private readonly silentAbort = new Set<number>();
  private readonly lastStatus = new Map<number, string>();
  private readonly controllers = new Map<number, AbortController>();
  private resumeTarget: number | null = null;
  private poll?: ReturnType<typeof setInterval>;

  @ViewChild('resumeInput') private readonly resumeInput?: ElementRef<HTMLInputElement>;

  readonly viewing = computed(() => {
    const id = this.viewingId();
    return id === null ? null : (this.lectures().find((l) => l.id === id) ?? null);
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const batchId = this.batchFilter();
    const status = this.statusFilter();

    return this.lectures().filter((l) => {
      if (batchId && l.batch_id !== batchId) return false;
      if (status !== 'All' && l.status !== status) return false;
      if (q && !l.title.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    void this.load();

    // Refresh every 5 seconds while a video is being processed
    this.poll = setInterval(() => {
      if (this.lectures().some((l) => l.processing_status === 'Processing')) {
        void this.refresh();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
    this.controllers.forEach((controller) => controller.abort());
  }

  /** Warn before leaving while uploads are active. */
  @HostListener('window:beforeunload', ['$event'])
  warnBeforeLeaving(event: BeforeUnloadEvent): void {
    if (Object.keys(this.uploads()).length > 0) event.preventDefault();
  }

  async load(): Promise<void> {
    this.loading.set(true);

    try {
      const [lectures, batches, courses] = await Promise.all([
        this.lectureService.getAll(),
        this.courseService.getAllBatches(),
        this.courseService.getCourses(),
      ]);

      this.lectures.set(lectures);
      this.rememberStatuses(lectures);
      this.batches.set(batches);
      this.courses.set(courses);
    } catch (e) {
      this.toast.error(this.message(e, 'Please try again in a moment.'), 'Unable to load lectures');
    } finally {
      this.loading.set(false);
    }
  }

  /** Refresh lectures without showing the loading screen. */
  private async refresh(): Promise<void> {
    try {
      const lectures = await this.lectureService.getAll();
      this.announceStatusChanges(lectures);
      this.lectures.set(lectures);
    } catch {
      // Retry on the next poll.
    }
  }

  private rememberStatuses(lectures: Lecture[]): void {
    this.lastStatus.clear();
    lectures.forEach((l) => this.lastStatus.set(l.id, l.processing_status));
  }

  /** Toast when a video finishes or fails processing. */
  private announceStatusChanges(lectures: Lecture[]): void {
    for (const l of lectures) {
      const before = this.lastStatus.get(l.id);

      if (before === 'Processing' && l.processing_status === 'Ready') {
        this.toast.success(`“${l.title}” is ready to watch.`, 'Video ready');
      } else if (before && before !== 'Failed' && l.processing_status === 'Failed') {
        this.toast.error(l.processing_error || 'The video could not be processed.', 'Processing failed');
      }
    }

    this.rememberStatuses(lectures);
  }

  duration(minutes: number): string {
    return formatDuration(minutes);
  }

  countStatus(status: LectureStatus): number {
    return this.lectures().filter((lecture) => lecture.status === status).length;
  }

  countProcessing(status: string): number {
    return this.lectures().filter((lecture) => lecture.processing_status === status).length;
  }

  bytes(value: number): string {
    return formatBytes(value);
  }

  percent(progress: UploadProgress): number {
    return progress.total ? Math.min(100, Math.floor((progress.sent / progress.total) * 100)) : 0;
  }

  speedText(lectureId: number): string {
    const s = this.speeds()[lectureId];
    const u = this.uploads()[lectureId];

    if (!s || !u || s.bytesPerSecond <= 0) return '';

    const remaining = Math.max(0, u.total - u.sent) / s.bytesPerSecond;
    const mins = Math.ceil(remaining / 60);
    const eta = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins} min`;

    return `${formatBytes(s.bytesPerSecond)}/s · ${eta} left`;
  }

  uploadLabel(l: Lecture): string {
    if (l.processing_status === 'Ready') return 'Replace video';
    if (l.processing_status === 'Uploading') return 'Resume upload';
    if (l.processing_status === 'Failed') return 'Upload again';
    return 'Upload video';
  }

  batchLabel(batchId: number): string {
    const batch = this.batches().find((b) => b.id === batchId);
    if (!batch) return 'Unknown batch';

    const course = this.courses().find((c) => c.id === batch.course_id);
    return `${course?.title ?? 'Course'} · ${batch.batch_name} (${batch.batch_code})`;
  }

  // ---------- Form ----------

  openCreate(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.file.set(null);

    if (this.batchFilter()) this.form.batch_id = this.batchFilter();

    this.modalOpen.set(true);
  }

  openEdit(l: Lecture): void {
    this.editingId.set(l.id);
    this.form = {
      batch_id: l.batch_id,
      title: l.title,
      description: l.description,
      status: l.status,
    };

    this.file.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onFormFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  async save(): Promise<void> {
    const chosen = this.file();
    const editing = this.editingId();

    this.saving.set(true);

    try {
      // Validate before creating a lecture record.
      if (chosen) this.lectureService.validateFile(chosen);
      if (!editing && !chosen) throw new Error('Please choose a video file to upload.');

      const input: LectureInput = {
        batch_id: this.form.batch_id,
        title: this.form.title.trim(),
        description: this.form.description.trim(),
        status: this.form.status,
      };

      let lectureId: number;

      if (editing) {
        await this.lectureService.update(editing, input);
        lectureId = editing;
        this.toast.success(`“${input.title}” has been updated.`, 'Lecture updated');
      } else {
        lectureId = (await this.lectureService.create(input)).id;
        this.toast.success(`“${input.title}” was created. Uploading the video now.`, 'Lecture created');
      }

      this.closeModal();
      await this.load();

      if (chosen) void this.startUpload(lectureId, chosen);
    } catch (e) {
      this.toast.error(this.message(e, 'Please try again.'), 'Unable to save lecture');
    } finally {
      this.saving.set(false);
    }
  }

  // ---------- Upload ----------

  /** Opens the file chooser from the upload button. */
  pickFile(lectureId: number): void {
    this.resumeTarget = lectureId;
    this.resumeInput?.nativeElement.click();
  }

  onResumeFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0];
    const lectureId = this.resumeTarget;

    input.value = '';
    this.resumeTarget = null;

    if (!chosen || lectureId === null) return;

    try {
      this.lectureService.validateFile(chosen);
    } catch (e) {
      this.toast.error(this.message(e, 'Please choose a different file.'), 'Invalid file');
      return;
    }

    void this.startUpload(lectureId, chosen);
  }

  cancelUpload(lectureId: number): void {
    this.controllers.get(lectureId)?.abort();
  }

  private async startUpload(lectureId: number, file: File): Promise<void> {
    if (this.controllers.has(lectureId)) {
      this.toast.warning('A video is already being uploaded for this lecture.', 'Upload in progress');
      return;
    }

    const controller = new AbortController();
    this.controllers.set(lectureId, controller);
    this.setProgress(lectureId, { sent: 0, total: file.size });

    try {
      await this.lectureService.uploadVideo(
        lectureId,
        file,
        (progress) => this.setProgress(lectureId, progress),
        controller.signal,
      );

      this.toast.success(
        'Upload complete. The video is now being processed. Large videos can take a while.',
        'Upload complete',
      );
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        if (!this.silentAbort.has(lectureId)) {
          this.toast.info(
            'You can resume anytime by choosing the same file again.',
            'Upload cancelled',
          );
        }
      } else {
        this.toast.error(this.message(e, 'Please try again.'), 'Upload failed');
      }
    } finally {
      this.silentAbort.delete(lectureId);
      this.controllers.delete(lectureId);

      this.uploads.update((current) => {
        const next = { ...current };
        delete next[lectureId];
        return next;
      });

      this.speeds.update((current) => {
        const next = { ...current };
        delete next[lectureId];
        return next;
      });

      await this.refresh();
    }
  }

  private setProgress(lectureId: number, progress: UploadProgress): void {
    const now = Date.now();
    const previous = this.speeds()[lectureId];

    if (!previous) {
      this.speeds.update((c) => ({
        ...c,
        [lectureId]: {
          bytesPerSecond: 0,
          at: now,
          sent: progress.sent,
        },
      }));
    } else if (now - previous.at >= 1000) {
      const instant = ((progress.sent - previous.sent) / (now - previous.at)) * 1000;
      const smoothed = previous.bytesPerSecond
        ? previous.bytesPerSecond * 0.7 + instant * 0.3
        : instant;

      this.speeds.update((c) => ({
        ...c,
        [lectureId]: {
          bytesPerSecond: Math.max(0, smoothed),
          at: now,
          sent: progress.sent,
        },
      }));
    }

    this.uploads.update((current) => ({
      ...current,
      [lectureId]: progress,
    }));
  }

  // ---------- Delete ----------

  async confirmDelete(): Promise<void> {
    const l = this.deleteTarget();
    if (!l) return;

    this.deleteTarget.set(null);

    if (this.controllers.has(l.id)) {
      this.silentAbort.add(l.id);
      this.controllers.get(l.id)?.abort();
    }

    this.deletingId.set(l.id);

    try {
      const { filesRemoved } = await this.lectureService.delete(l.id);

      if (this.viewingId() === l.id) this.viewingId.set(null);

      if (filesRemoved) {
        this.toast.success(`“${l.title}” and its video were deleted.`, 'Lecture deleted');
      } else {
        this.toast.warning(
          'The lecture was deleted, but the video server could not be reached, so its files may still be on the server.',
          'Deleted with a warning',
        );
      }

      await this.load();
    } catch (e) {
      this.toast.error(this.message(e, 'Please try again.'), 'Unable to delete lecture');
    } finally {
      this.deletingId.set(null);
    }
  }

  private emptyForm(): LectureInput {
    return {
      batch_id: 0,
      title: '',
      description: '',
      status: 'Published',
    };
  }

  private message(e: unknown, fallback: string): string {
    return (e as { message?: string })?.message || fallback;
  }
}