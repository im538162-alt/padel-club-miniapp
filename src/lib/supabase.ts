import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase: переменные VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY не заданы. ' +
      'Задайте их в .env.local на основе .env.example.',
  )
}

// Публикуемый (anon/publishable) ключ — безопасен для клиента.
// Никогда не используйте здесь service_role key.
// createClient с пустой строкой бросает исключение, поэтому при отсутствии
// переменных клиент не создаётся вовсе — вызывающий код обязан проверять isSupabaseConfigured.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null
