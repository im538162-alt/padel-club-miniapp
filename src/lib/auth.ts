import { isSupabaseConfigured, supabase } from './supabase'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

// Email-вход нужен только вне Telegram (обычный браузер/установленное PWA).
// Ссылка из письма открывается в Safari, а установленное PWA хранит сессию
// отдельно от неё, поэтому вместо перехода по ссылке пользователь вводит
// код из того же письма прямо в PWA — сессия тогда создаётся в этом же клиенте.
export async function requestEmailOtp(email: string): Promise<void> {
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

export async function verifyEmailOtp(email: string, code: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })

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
