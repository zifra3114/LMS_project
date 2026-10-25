import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type UserRole = 'admin' | 'teacher' | 'student';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: this.friendlyError(error.message) };
    }

    if (!(await this.isAdmin(data.user.id))) {
      await this.supabase.client.auth.signOut();
      return { error: 'You do not have permission to access the admin panel.' };
    }
    return { error: null };
  }

  /** Student portal login. Only accounts with the "student" role may enter. */
  async loginStudent(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: this.friendlyError(error.message) };
    }

    if (!(await this.isStudent(data.user.id))) {
      await this.supabase.client.auth.signOut();
      return { error: 'This account does not have student access.' };
    }
    return { error: null };
  }

  async getRole(userId: string): Promise<UserRole | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) return null;
    return (data?.role as UserRole) ?? null;
  }

  async isAdmin(userId: string): Promise<boolean> {
    return (await this.getRole(userId)) === 'admin';
  }

  async isTeacher(userId: string): Promise<boolean> {
    return (await this.getRole(userId)) === 'teacher';
  }

  async isStudent(userId: string): Promise<boolean> {
    return (await this.getRole(userId)) === 'student';
  }

  async getSession() {
    const { data } = await this.supabase.client.auth.getSession();
    return data.session;
  }

  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user ?? null;
  }

  async getCurrentEmail(): Promise<string | null> {
    const session = await this.getSession();
    return session?.user.email ?? null;
  }

  logout() {
    return this.supabase.client.auth.signOut();
  }

  private friendlyError(message: string): string {
    return message.toLowerCase().includes('invalid login credentials')
      ? 'Invalid email or password.'
      : 'Unable to sign in right now. Please try again.';
  }
}