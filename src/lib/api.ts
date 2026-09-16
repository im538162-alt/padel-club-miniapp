import { FunctionsHttpError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import { getTelegramInitData } from '../utils/telegram'
import type { CourtInfo, PlayerProfile, SkillLevel } from '../types'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

const NOT_IN_TELEGRAM_MESSAGE =
  'Доступно только внутри Telegram. Откройте Padel Club через Telegram-бота и повторите попытку.'

export interface RemoteBooking {
  courtId: number
  startTime: string
  endTime: string
}

export interface CreateBookingInput {
  courtId: number
  bookingDate: string
  startTime: string
}

export interface CancelBookingInput {
  bookingId: string
}

export interface UpdatePlayerProfileInput {
  displayName: string
  city: string
  skillLevel: SkillLevel
}

export interface MyBookingRow {
  id: string
  courtName: string
  dateKey: string
  time: string
}

// Схема таблиц Supabase:
//   courts(id bigint, name text)
//   bookings(id uuid, court_id bigint references courts.id, booking_date date,
//            start_time time, end_time time, player_name text,
//            telegram_user_id bigint, status text)
//
// Для занятости корта учитываются только подтверждённые брони (status = 'confirmed').
// Слот считается занятым, если его часовой интервал пересекается с [start_time, end_time)
// хотя бы одной такой брони того же корта — сравнение идёт в AppContext.getSlotsForCourt.
//
// Создание брони идёт не прямым insert в bookings, а через Edge Function
// create-booking-v2 (она сама проверяет initData и пишет запись на сервере).
// Отмена брони — тем же способом, через Edge Function cancel-booking.
//
// Список «Моих игр» приходит через Edge Function my-bookings. Формат ответа:
// массив объектов (либо { bookings: [...] }) с полями booking_date, start_time
// и courts.name (courts может быть как объектом, так и массивом) — код ниже
// терпимо относится и к camelCase-варианту этих же полей.
//
// Профиль игрока — через Edge Function player-profile: action 'get' отдаёт
// текущий профиль (объект напрямую либо { profile: {...} }), action 'update'
// сохраняет displayName/city/skillLevel и не трогает рейтинг (он read-only).

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
    .select('court_id, start_time, end_time')
    .eq('booking_date', dateKey)
    .eq('status', 'confirmed')

  if (error) {
    throw new Error(error.message)
  }

  // start_time/end_time приходят из Postgres как "HH:MM:SS" — приводим к формату
  // "HH:MM", в котором заданы слоты TIME_SLOTS.
  return (data ?? []).map((row) => ({
    courtId: row.court_id as number,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
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

  return 'Не удалось выполнить запрос. Попробуйте ещё раз.'
}

export async function createBooking(input: CreateBookingInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { error } = await supabase.functions.invoke('create-booking-v4', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
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

export async function cancelBooking(input: CancelBookingInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { error } = await supabase.functions.invoke('cancel-booking', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: {
      initData,
      bookingId: input.bookingId,
    },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }
}

interface RawMyBooking {
  id?: string | number
  court_name?: string
  courtName?: string
  court?: { name?: string }
  // courts может прийти как объект (связь один-к-одному) или как массив
  // (связь один-ко-многим/join) — оба варианта встречаются у PostgREST.
  courts?: { name?: string } | { name?: string }[]
  booking_date?: string
  bookingDate?: string
  start_time?: string
  startTime?: string
}

function extractCourtsName(courts: RawMyBooking['courts']): string | undefined {
  if (Array.isArray(courts)) return courts[0]?.name
  return courts?.name
}

function toMyBookingRow(raw: RawMyBooking, index: number): MyBookingRow {
  const courtName =
    extractCourtsName(raw.courts) ?? raw.court_name ?? raw.courtName ?? raw.court?.name ?? 'Корт'
  const dateKey = raw.booking_date ?? raw.bookingDate ?? ''
  // start_time приходит из Postgres как "HH:MM:SS" — приводим к "HH:MM".
  const time = String(raw.start_time ?? raw.startTime ?? '').slice(0, 5)
  const id = raw.id != null ? String(raw.id) : `${dateKey}-${time}-${courtName}-${index}`

  return { id, courtName, dateKey, time }
}

export async function fetchMyBookings(): Promise<MyBookingRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('my-bookings-v2', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  const rawRows: RawMyBooking[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { bookings?: unknown } | null)?.bookings)
      ? (data as { bookings: RawMyBooking[] }).bookings
      : []

  return rawRows.map(toMyBookingRow)
}

interface RawPlayerProfile {
  display_name?: string
  displayName?: string
  name?: string
  city?: string | null
  skill_level?: string | number
  skillLevel?: string | number
  rating?: number | string
}

// skillLevel может прийти как английское слово, число (1-3) или уже готовая
// русская подпись — терпимо приводим к одному из трёх канонических значений.
function normalizeSkillLevel(raw: string | number | undefined): SkillLevel {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()

  if (['advanced', 'pro', '3', 'продвинутый'].includes(value)) return 'advanced'
  if (['amateur', 'intermediate', '2', 'любитель'].includes(value)) return 'intermediate'
  return 'beginner'
}

function toPlayerProfile(raw: RawPlayerProfile): PlayerProfile {
  return {
    displayName: raw.display_name ?? raw.displayName ?? raw.name ?? '',
    city: raw.city ? String(raw.city) : null,
    skillLevel: normalizeSkillLevel(raw.skill_level ?? raw.skillLevel),
    rating: Number(raw.rating ?? 0) || 0,
  }
}

export async function fetchPlayerProfile(): Promise<PlayerProfile> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('player-profile', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData, action: 'get' },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  const raw: RawPlayerProfile =
    (data as { profile?: RawPlayerProfile } | null)?.profile ?? (data as RawPlayerProfile | null) ?? {}

  return toPlayerProfile(raw)
}

export async function updatePlayerProfile(input: UpdatePlayerProfileInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { error } = await supabase.functions.invoke('player-profile', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: {
      initData,
      action: 'update',
      displayName: input.displayName,
      city: input.city,
      skillLevel: input.skillLevel,
    },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }
}
