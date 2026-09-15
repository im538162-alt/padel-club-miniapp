import { isSupabaseConfigured, supabase } from './supabase'
import type { CourtInfo } from '../types'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

export interface RemoteBooking {
  courtId: number
  time: string
}

// Схема таблиц Supabase:
//   courts(id bigint, name text)
//   bookings(id uuid, court_id bigint references courts.id, booking_date date,
//            start_time time, end_time time, player_name text,
//            telegram_user_id bigint, status text)
//
// Для занятости корта учитываются только подтверждённые брони (status = 'confirmed'),
// сопоставление идёт по court_id и start_time.

export async function fetchCourts(): Promise<CourtInfo[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase.from('courts').select('id, name').order('id', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({ id: row.id as number, name: row.name as string }))
}

export async function fetchBookingsForDate(dateKey: string): Promise<RemoteBooking[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('court_id, start_time')
    .eq('booking_date', dateKey)
    .eq('status', 'confirmed')

  if (error) {
    throw new Error(error.message)
  }

  // start_time приходит из Postgres как "HH:MM:SS" — приводим к формату "HH:MM",
  // в котором заданы слоты TIME_SLOTS.
  return (data ?? []).map((row) => ({
    courtId: row.court_id as number,
    time: String(row.start_time).slice(0, 5),
  }))
}
