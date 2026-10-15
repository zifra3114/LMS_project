import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type QuestionType = 'single' | 'multiple';

export interface QuizQuestionDraft {
  question_text: string;
  type: QuestionType;
  options: string[];
  correct_options: number[];
  marks: number;
}

export interface QuizDraft {
  course_id: number;
  batch_id: number | null;
  title: string;
  description: string;
  duration_minutes: number;
  passing_marks: number;
  deadline: string | null;
  questions: QuizQuestionDraft[];
}

export interface QuizRecord {
  id: number;
  course_id: number;
  batch_id: number | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: 'draft' | 'published' | 'closed';
  deadline: string | null;
  created_at: string;
}

export interface QuizForEdit {
  quiz: QuizRecord;
  questions: QuizQuestionDraft[];
}

export interface QuizBatchOption {
  id: number;
  course_id: number;
  batch_name: string;
  batch_code: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly supabase = inject(SupabaseService);

  private withTimeout<T>(
    promise: PromiseLike<T>,
    ms = 15000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              'Request timed out. Check your connection or Supabase settings.',
            ),
          ),
        ms,
      );

      Promise.resolve(promise).then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  // ---------------- DEADLINE HELPERS ----------------

  private isExpired(deadline: string | null): boolean {
    if (!deadline) return false;

    const deadlineTime = new Date(deadline).getTime();

    if (!Number.isFinite(deadlineTime)) {
      throw new Error('Invalid quiz deadline.');
    }

    return deadlineTime <= Date.now();
  }

  private validateDeadline(deadline: string | null): void {
    if (this.isExpired(deadline)) {
      throw new Error(
        'Quiz deadline has expired. Update the deadline before publishing or reopening.',
      );
    }
  }

  /**
   * Closes expired published quizzes in Supabase.
   *
   * This runs when getQuizzes() is called.
   * A scheduled database/server job is needed for closure
   * at the exact deadline when nobody opens the admin page.
   */
  private async closeExpiredQuizzes(): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .update({ status: 'closed' })
        .eq('status', 'published')
        .not('deadline', 'is', null)
        .lte('deadline', now),
    );

    if (error) {
      throw new Error(
        `Unable to close expired quizzes: ${error.message}`,
      );
    }
  }

  // ---------------- GET QUIZZES ----------------

  async getQuizzes(): Promise<QuizRecord[]> {
    await this.closeExpiredQuizzes();

    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as QuizRecord[];
  }

  async getCourses(): Promise<{ id: number; title: string }[]> {
    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('courses')
        .select('id, title')
        .order('title'),
    );

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  // ---------------- GET BATCHES OF A COURSE ----------------

  async getBatches(courseId: number): Promise<QuizBatchOption[]> {
    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('course_batches')
        .select('id, course_id, batch_name, batch_code')
        .eq('course_id', courseId)
        .order('start_date', { ascending: true }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as QuizBatchOption[];
  }

  // ---------------- GET ALL BATCHES ----------------

  async getAllBatches(): Promise<QuizBatchOption[]> {
    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('course_batches')
        .select('id, course_id, batch_name, batch_code')
        .order('batch_name', { ascending: true }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as QuizBatchOption[];
  }

  // ---------------- GET QUIZ FOR EDIT ----------------

  async getQuizForEdit(quizId: number): Promise<QuizForEdit> {
    const { data: quiz, error: quizError } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single(),
    );

    if (quizError) {
      throw new Error(quizError.message);
    }

    const { data: rows, error: questionError } = await this.withTimeout(
      this.supabase.client
        .from('quiz_questions')
        .select(
          'id, question_text, question_type, options, marks, question_order',
        )
        .eq('quiz_id', quizId)
        .order('question_order'),
    );

    if (questionError) {
      throw new Error(questionError.message);
    }

    const ids = (rows ?? []).map((row: any) => row.id);

    let keys: {
      question_id: number;
      correct_option: number;
    }[] = [];

    if (ids.length) {
      const { data, error } = await this.withTimeout(
        this.supabase.client
          .from('quiz_answer_keys')
          .select('question_id, correct_option')
          .in('question_id', ids),
      );

      if (error) {
        throw new Error(error.message);
      }

      keys = (data ?? []) as typeof keys;
    }

    const questions: QuizQuestionDraft[] = (rows ?? []).map(
      (row: any) => {
        const correct = keys
          .filter((key) => key.question_id === row.id)
          .map((key) => key.correct_option)
          .sort((a, b) => a - b);

        return {
          question_text: row.question_text,
          type: (row.question_type as QuestionType) ?? 'single',
          options: [...(row.options as string[])],
          correct_options: correct.length ? correct : [0],
          marks: row.marks,
        };
      },
    );

    return {
      quiz: quiz as QuizRecord,
      questions,
    };
  }

  // ---------------- CREATE QUIZ ----------------

  async createQuiz(draft: QuizDraft): Promise<QuizRecord> {
    this.validateDraft(draft);

    this.validateDeadline(draft.deadline);

    const { data: userData, error: userError } =
      await this.supabase.client.auth.getUser();

    if (userError || !userData.user) {
      throw new Error('Please log in before creating a quiz.');
    }

    const totalMarks = draft.questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );

    const { data: quiz, error: quizError } =
      await this.supabase.client
        .from('quizzes')
        .insert({
          course_id: draft.course_id,
          batch_id: draft.batch_id ?? null,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          duration_minutes: draft.duration_minutes,
          total_marks: totalMarks,
          passing_marks: draft.passing_marks,
          deadline: draft.deadline || null,
          status: 'draft',
          created_by: userData.user.id,
        })
        .select('*')
        .single();

    if (quizError) {
      throw new Error(quizError.message);
    }

    try {
      await this.insertQuestions(quiz.id, draft.questions);
    } catch (error) {
      await this.supabase.client
        .from('quizzes')
        .delete()
        .eq('id', quiz.id);

      throw error;
    }

    return quiz as QuizRecord;
  }

  // ---------------- UPDATE QUIZ ----------------

  async updateQuiz(
    quizId: number,
    draft: QuizDraft,
  ): Promise<void> {
    this.validateDraft(draft);

    this.validateDeadline(draft.deadline);

    const totalMarks = draft.questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );

    const { error: quizError } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .update({
          course_id: draft.course_id,
          batch_id: draft.batch_id ?? null,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          duration_minutes: draft.duration_minutes,
          total_marks: totalMarks,
          passing_marks: draft.passing_marks,
          deadline: draft.deadline || null,
        })
        .eq('id', quizId),
    );

    if (quizError) {
      throw new Error(quizError.message);
    }

    const { error: deleteError } = await this.withTimeout(
      this.supabase.client
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId),
    );

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await this.insertQuestions(quizId, draft.questions);
  }

  // ---------------- PUBLISH QUIZ ----------------

  async publishQuiz(quizId: number): Promise<void> {
    const quiz = await this.getQuizStatusAndDeadline(quizId);

    if (quiz.status !== 'draft') {
      throw new Error('Only draft quizzes can be published.');
    }

    this.validateDeadline(quiz.deadline);

    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quizId)
        .eq('status', 'draft')
        .select('id'),
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      throw new Error(
        'Quiz was not published. It may have been changed by another user.',
      );
    }
  }

  // ---------------- CLOSE QUIZ ----------------

  async closeQuiz(quizId: number): Promise<void> {
    const quiz = await this.getQuizStatusAndDeadline(quizId);

    if (quiz.status !== 'published') {
      throw new Error('Only published quizzes can be closed.');
    }

    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .update({ status: 'closed' })
        .eq('id', quizId)
        .eq('status', 'published')
        .select('id'),
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      throw new Error(
        'Quiz could not be closed. Please refresh and try again.',
      );
    }
  }

  // ---------------- REOPEN QUIZ ----------------

  async reopenQuiz(quizId: number): Promise<void> {
    const quiz = await this.getQuizStatusAndDeadline(quizId);

    if (quiz.status !== 'closed') {
      throw new Error('Only closed quizzes can be reopened.');
    }

    this.validateDeadline(quiz.deadline);

    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quizId)
        .eq('status', 'closed')
        .select('id'),
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      throw new Error(
        'Quiz could not be reopened. Please refresh and try again.',
      );
    }
  }

  // ---------------- STATUS HELPER ----------------

  private async getQuizStatusAndDeadline(
    quizId: number,
  ): Promise<{
    status: QuizRecord['status'];
    deadline: string | null;
  }> {
    const { data, error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .select('status, deadline')
        .eq('id', quizId)
        .single(),
    );

    if (error) {
      throw new Error(error.message);
    }

    return data as {
      status: QuizRecord['status'];
      deadline: string | null;
    };
  }

  // ---------------- DELETE QUIZ ----------------

  async deleteQuiz(quizId: number): Promise<void> {
    const { error } = await this.withTimeout(
      this.supabase.client
        .from('quizzes')
        .delete()
        .eq('id', quizId),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  // ---------------- INSERT QUESTIONS ----------------

  private async insertQuestions(
    quizId: number,
    questions: QuizQuestionDraft[],
  ): Promise<void> {
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];

      const { data: saved, error: questionError } =
        await this.withTimeout(
          this.supabase.client
            .from('quiz_questions')
            .insert({
              quiz_id: quizId,
              question_text: question.question_text.trim(),
              question_type: question.type,
              options: question.options,
              marks: question.marks,
              question_order: index + 1,
            })
            .select('id')
            .single(),
        );

      if (questionError) {
        throw new Error(questionError.message);
      }

      const { error: answerError } = await this.withTimeout(
        this.supabase.client
          .from('quiz_answer_keys')
          .insert(
            question.correct_options.map((option) => ({
              question_id: saved.id,
              correct_option: option,
            })),
          ),
      );

      if (answerError) {
        throw new Error(answerError.message);
      }
    }
  }

  // ---------------- VALIDATION ----------------

  private validateDraft(draft: QuizDraft): void {
    if (!draft.title.trim()) {
      throw new Error('Quiz title is required.');
    }

    if (
      !Number.isInteger(draft.course_id) ||
      draft.course_id <= 0
    ) {
      throw new Error('Please select a valid course.');
    }

    if (
      draft.batch_id !== null &&
      (!Number.isInteger(draft.batch_id) || draft.batch_id <= 0)
    ) {
      throw new Error('Please select a valid batch.');
    }

    if (
      !Number.isInteger(draft.duration_minutes) ||
      draft.duration_minutes <= 0
    ) {
      throw new Error('Duration must be greater than zero.');
    }

    if (
      !Number.isInteger(draft.passing_marks) ||
      draft.passing_marks < 0
    ) {
      throw new Error('Passing marks cannot be negative.');
    }

    if (!draft.questions.length) {
      throw new Error('Add at least one question.');
    }

    for (const [index, question] of draft.questions.entries()) {
      const number = index + 1;

      if (!question.question_text.trim()) {
        throw new Error(`Question ${number} cannot be empty.`);
      }

      if (
        question.options.length < 2 ||
        question.options.some((option) => !option.trim())
      ) {
        throw new Error(
          `Question ${number} needs at least two non-empty options.`,
        );
      }

      const valid = question.correct_options.every(
        (option) =>
          Number.isInteger(option) &&
          option >= 0 &&
          option < question.options.length,
      );

      if (!valid || question.correct_options.length === 0) {
        throw new Error(
          `Select the correct answer for question ${number}.`,
        );
      }

      if (
        question.type === 'single' &&
        question.correct_options.length !== 1
      ) {
        throw new Error(
          `Question ${number} is single choice, so select exactly one answer.`,
        );
      }

      if (
        !Number.isInteger(question.marks) ||
        question.marks <= 0
      ) {
        throw new Error(
          `Question ${number} must have positive marks.`,
        );
      }
    }

    const totalMarks = draft.questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );

    if (draft.passing_marks > totalMarks) {
      throw new Error(
        'Passing marks cannot exceed total marks.',
      );
    }
  }

  // ---------------- STUDENT METHODS ----------------

  /** Student ka batch ID nikalta hai students table se */
  private async getMyBatchIds(): Promise<number[]> {
    const { data: auth, error: authError } = await this.supabase.client.auth.getUser();

    if (authError) throw authError;
    if (!auth.user) return [];

    const { data, error } = await this.supabase.client
      .from('students')
      .select('*')
      .eq('user_id', auth.user.id);

    if (error) throw error;

    const batchIds: number[] = [];
    for (const row of data ?? []) {
      const batchId = row['batch_id'] ?? row['course_batch_id'] ?? row['batchId'];
      if (batchId && !isNaN(Number(batchId))) {
        batchIds.push(Number(batchId));
      }
    }

    return batchIds;
  }

  /** Student ke liye published quizzes */
  async getQuizzesForStudent(): Promise<QuizRecord[]> {
    const batchIds = await this.getMyBatchIds();
    if (batchIds.length === 0) return [];

    // Try both batch_id and course_batch_id
    const queries = [
      this.supabase.client
        .from('quizzes')
        .select('*')
        .in('batch_id', batchIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      this.supabase.client
        .from('quizzes')
        .select('*')
        .in('course_batch_id', batchIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
    ];

    for (const query of queries) {
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as QuizRecord[];
      }
    }

    return [];
  }
}