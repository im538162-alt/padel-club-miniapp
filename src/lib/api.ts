import { FunctionsHttpError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import { getTelegramInitData } from '../utils/telegram'
import type { CourtInfo } from '../types'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

const NOT_IN_TELEGRAM_MESSAGE =
  'Бронирование доступно только внутри Telegram. Откройте Padel Club через Telegram-бота и повторите попытку.'

export interface RemoteBooking {
  courtId: number
  time: string
}

export interface CreateBookingInput {
  courtId: number
  bookingDate: string
  startTime: string
}

// Схема таблиц Supabase:
//   courts(id bigint, name text)
//   bookings(id uuid, court_id bigint references courts.id, booking_date date,
//            start_time time, end_time time, player_name text,
//            telegram_user_id bigint, status text)
//
// Для занятости корта учитываются только подтверждённые брони (status = 'confirmed'),
// сопоставление идёт по court_id и start_time.
//
// Создание брони идёт не прямым insert в bookings, а через Edge Function
// create-booking (она сама проверяет initData и пишет запись на сервере).

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

// Edge Function возвращает ошибку в JSON-теле ответа (например, "слот уже занят"),
// а не в error.message — его нужно достать из тела HTTP-ответа отдельно.
async function resolveFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return body.error
      if (typeof body?.message === 'string') return body.message
    } catch {
      // тело ответа не JSON — используем сообщение по умолчанию ниже
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Не удалось создать бронирование. Попробуйте ещё раз.'
}

export async function createBooking(input: CreateBookingInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { error } = await supabase.functions.invoke('create-booking', {
    body: {
      initData,
      courtId: input.courtId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
    },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }
}
