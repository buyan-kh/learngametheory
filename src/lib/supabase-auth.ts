import { createClient } from './supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export async function signUp(email: string, password: string) {
  const supabase = createClient();
  if (!supabase) {
    return { data: null, error: { message: 'Supabase is not configured' } };
  }
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  if (!supabase) {
    return { data: null, error: { message: 'Supabase is not configured' } };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  const supabase = createClient();
  if (!supabase) {
    return { data: null, error: { message: 'Supabase is not configured' } };
  }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  const supabase = createClient();
  if (!supabase) {
    return { error: { message: 'Supabase is not configured' } };
  }
  return supabase.auth.signOut();
}

export async function getSession() {
  const supabase = createClient();
  if (!supabase) {
    return { data: { session: null }, error: null };
  }
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const supabase = createClient();
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

export type { User, Session };
