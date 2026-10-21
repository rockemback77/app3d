import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export const auth = $state<{ user: User | null; loading: boolean; recovery: boolean }>({
  user: null,
  loading: true,
  recovery: false,
});

let started = false;

/** Inicia o acompanhamento da sessão. Dispara onLogin quando um usuário entra. */
export function startAuth(onLogin: () => void, onLogout: () => void): void {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
    auth.user = data.session?.user ?? null;
    auth.loading = false;
    if (auth.user) onLogin();
  });

  supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
    const prev = auth.user?.id ?? null;
    auth.user = session?.user ?? null;
    const now = auth.user?.id ?? null;
    if (event === 'PASSWORD_RECOVERY') auth.recovery = true;
    if (now && now !== prev) onLogin();
    if (!now && prev) onLogout();
  });
}

export async function signUp(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? error.message : null;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signInWithGoogle(): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return error ? error.message : null;
}

export async function updatePassword(newPassword: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (!error) auth.recovery = false;
  return error ? error.message : null;
}
