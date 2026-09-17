import { isSupabaseConfigured, supabase } from './supabase'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

// Email-вход нужен только вне Telegram (обычный браузер/установленное PWA) —
// используется штатная Supabase Auth (magic link), Telegram-режим её не касается.
export async function requestEmailLoginLink(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function signOutEmailSession(): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}
