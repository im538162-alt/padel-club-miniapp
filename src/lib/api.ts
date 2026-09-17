import { FunctionsHttpError } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import { getTelegramInitData } from '../utils/telegram'
import type {
  AdminBookingRow,
  AdminCourt,
  AdminDashboard,
  CourtInfo,
  LeaderboardEntry,
  OpenMatch,
  OpenMatchOrganizer,
  OpenMatchParticipant,
  PlayerProfile,
  SkillLevel,
} from '../types'

const NOT_CONFIGURED_MESSAGE =
  'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local'

const NOT_IN_TELEGRAM_MESSAGE =
  'Доступно только внутри Telegram. Откройте Padel Club через Telegram-бота и повторите попытку.'

const ADMIN_NOT_IN_TELEGRAM_MESSAGE = 'Админ-панель доступна только внутри Telegram.'

const OPEN_MATCHES_NOT_IN_TELEGRAM_MESSAGE = 'Открытые игры доступны только внутри Telegram.'

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
// avatarPath из профиля превращается в публичный URL хранилища avatars.
//
// Рейтинг игроков — через Edge Function player-leaderboard: массив объектов
// напрямую, либо { players: [...] } (реальный формат ответа), либо { leaderboard: [...] }
// с полями rank, displayName, skillLevel, rating, isCurrentUser — код ниже
// терпимо относится и к snake_case-варианту полей.
//
// Фото профиля — через Edge Function upload-avatar: body { initData, imageDataUrl },
// ответ содержит либо готовый URL, либо путь в бакете avatars (из которого URL
// строится тем же способом, что и для профиля).
//
// Админ-панель — через Edge Function admin-dashboard, три action на один и тот
// же endpoint: 'overview' (только чтение), 'createCourt' ({ name }),
// 'updateCourt' ({ courtId, name?, active? }). Все принимают { initData, action, ... }
// и возвращают один и тот же полный dashboard:
// { stats: { activeCourts, players, confirmedBookings }, courts: [...], recentBookings: [...] }.
// Доступна только внутри Telegram и только администраторам — 403 от 'overview'
// означает «не админ» и не является ошибкой (см. fetchAdminDashboard); 403 от
// createCourt/updateCourt — обычная ошибка, т.к. эти действия и так вызываются
// только уже подтверждённым админом.

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

interface RawLeaderboardEntry {
  rank?: number | string
  display_name?: string
  displayName?: string
  name?: string
  skill_level?: string | number
  skillLevel?: string | number
  rating?: number | string
  is_current_user?: boolean
  isCurrentUser?: boolean
}

function toLeaderboardEntry(raw: RawLeaderboardEntry, index: number): LeaderboardEntry {
  return {
    rank: Number(raw.rank ?? index + 1) || index + 1,
    displayName: raw.display_name ?? raw.displayName ?? raw.name ?? '',
    skillLevel: normalizeSkillLevel(raw.skill_level ?? raw.skillLevel),
    rating: Number(raw.rating ?? 0) || 0,
    isCurrentUser: Boolean(raw.is_current_user ?? raw.isCurrentUser ?? false),
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const { data, error } = await supabase.functions.invoke('player-leaderboard', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  const wrapped = data as { players?: unknown; leaderboard?: unknown } | null
  const rawRows: RawLeaderboardEntry[] = Array.isArray(data)
    ? data
    : Array.isArray(wrapped?.players)
      ? (wrapped as { players: RawLeaderboardEntry[] }).players
      : Array.isArray(wrapped?.leaderboard)
        ? (wrapped as { leaderboard: RawLeaderboardEntry[] }).leaderboard
        : []

  return rawRows.map(toLeaderboardEntry).sort((a, b) => a.rank - b.rank)
}

// Публичный URL строится из avatar_path так же, как задокументировано в задаче:
// {VITE_SUPABASE_URL}/storage/v1/object/public/avatars/{avatarPath}.
function buildAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null

  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!baseUrl) return null

  return `${baseUrl}/storage/v1/object/public/avatars/${avatarPath}`
}

interface RawPlayerProfile {
  display_name?: string
  displayName?: string
  name?: string
  city?: string | null
  skill_level?: string | number
  skillLevel?: string | number
  rating?: number | string
  avatar_path?: string | null
  avatarPath?: string | null
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
  const avatarPath = raw.avatar_path ?? raw.avatarPath ?? null

  return {
    displayName: raw.display_name ?? raw.displayName ?? raw.name ?? '',
    city: raw.city ? String(raw.city) : null,
    skillLevel: normalizeSkillLevel(raw.skill_level ?? raw.skillLevel),
    rating: Number(raw.rating ?? 0) || 0,
    avatarPath,
    avatarUrl: buildAvatarUrl(avatarPath),
  }
}

// Telegram-режим: initData + явный apikey-Authorization (см. Fix Edge Function
// authorization). Вне Telegram (PWA/email) initData нет — тогда Authorization
// не подменяем вовсе, и supabase-js сам подставляет JWT текущей Auth-сессии;
// в body в этом случае initData не отправляется.
export async function fetchPlayerProfile(): Promise<PlayerProfile> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()

  const { data, error } = await supabase.functions.invoke(
    'player-profile',
    initData
      ? {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: { initData, action: 'get' },
        }
      : { body: { action: 'get' } },
  )

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
  const updateFields = {
    action: 'update' as const,
    displayName: input.displayName,
    city: input.city,
    skillLevel: input.skillLevel,
  }

  const { error } = await supabase.functions.invoke(
    'player-profile',
    initData
      ? {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: { initData, ...updateFields },
        }
      : { body: updateFields },
  )

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }
}

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Не удалось прочитать файл изображения'))
      }
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'))
    reader.readAsDataURL(file)
  })
}

export async function uploadProfileAvatar(file: File): Promise<string | null> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Поддерживаются только изображения JPEG, PNG или WebP')
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Размер фото не должен превышать 2 МБ')
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(NOT_IN_TELEGRAM_MESSAGE)
  }

  const imageDataUrl = await readFileAsDataUrl(file)

  const { data, error } = await supabase.functions.invoke('upload-avatar', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData, imageDataUrl },
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  const raw = data as
    | { url?: string; avatarUrl?: string; avatar_url?: string; path?: string; avatarPath?: string; avatar_path?: string }
    | null

  const url = raw?.url ?? raw?.avatarUrl ?? raw?.avatar_url
  if (url) return url

  const path = raw?.path ?? raw?.avatarPath ?? raw?.avatar_path
  return buildAvatarUrl(path)
}

interface RawAdminBookingCourt {
  name?: string
}

interface RawAdminBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled'
  player_name: string
  created_at: string
  courts: RawAdminBookingCourt | RawAdminBookingCourt[] | null
}

interface RawAdminCourtEntry {
  id?: number | string
  name?: string
  active?: boolean
}

interface RawAdminDashboard {
  stats?: {
    activeCourts?: number
    players?: number
    confirmedBookings?: number
  }
  courts?: RawAdminCourtEntry[]
  recentBookings?: RawAdminBooking[]
}

// courts может прийти объектом, массивом или null — отдельный хелпер, чтобы не
// трогать extractCourtsName из fetchMyBookings (та завязана на другой тип).
function extractAdminCourtName(courts: RawAdminBooking['courts']): string {
  if (Array.isArray(courts)) return courts[0]?.name ?? 'Корт'
  return courts?.name ?? 'Корт'
}

function toAdminBookingRow(raw: RawAdminBooking): AdminBookingRow {
  return {
    id: raw.id,
    courtName: extractAdminCourtName(raw.courts),
    dateKey: raw.booking_date,
    startTime: String(raw.start_time).slice(0, 5),
    endTime: String(raw.end_time).slice(0, 5),
    status: raw.status,
    playerName: raw.player_name,
    createdAt: raw.created_at,
  }
}

function toAdminCourtEntry(raw: RawAdminCourtEntry): AdminCourt {
  return {
    id: Number(raw.id ?? 0) || 0,
    name: raw.name ?? '',
    active: Boolean(raw.active),
  }
}

function toAdminDashboard(raw: RawAdminDashboard): AdminDashboard {
  return {
    stats: {
      activeCourts: Number(raw.stats?.activeCourts ?? 0) || 0,
      players: Number(raw.stats?.players ?? 0) || 0,
      confirmedBookings: Number(raw.stats?.confirmedBookings ?? 0) || 0,
    },
    courts: (raw.courts ?? []).map(toAdminCourtEntry),
    recentBookings: (raw.recentBookings ?? []).map(toAdminBookingRow),
  }
}

// Общий вызов admin-dashboard для всех admin-действий (overview/createCourt/
// updateCourt) — один набор заголовков/initData/проверок на все три, чтобы не
// дублировать эту часть в каждой функции.
async function callAdminDashboard(extraBody: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(ADMIN_NOT_IN_TELEGRAM_MESSAGE)
  }

  return supabase.functions.invoke('admin-dashboard', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData, ...extraBody },
  })
}

// Возвращает null, если Edge Function ответила 403 — это означает «текущий
// пользователь не администратор», ожидаемый исход, а не сбой сети или конфига.
export async function fetchAdminDashboard(): Promise<AdminDashboard | null> {
  const { data, error } = await callAdminDashboard({ action: 'overview' })

  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 403) {
      return null
    }
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return toAdminDashboard(data as RawAdminDashboard)
}

// createCourt/updateCourt вызываются только уже подтверждённым админом (кнопки
// в AdminScreen видны лишь при isAdmin), поэтому здесь 403 не заглушаем —
// это будет означать настоящий сбой и должно дойти до пользователя как ошибка.
export async function createAdminCourt(name: string): Promise<AdminDashboard> {
  const { data, error } = await callAdminDashboard({ action: 'createCourt', name })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return toAdminDashboard(data as RawAdminDashboard)
}

export async function updateAdminCourt(
  courtId: number,
  updates: { name?: string; active?: boolean },
): Promise<AdminDashboard> {
  const { data, error } = await callAdminDashboard({
    action: 'updateCourt',
    courtId,
    ...updates,
  })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return toAdminDashboard(data as RawAdminDashboard)
}

// Открытые игры — через Edge Function open-matches: action 'list' отдаёт все
// открытые игры, 'create' открывает игру на основе своей будущей брони
// ({ bookingId, capacity }), 'join' присоединяет к игре ({ matchId }). Все три
// возвращают один и тот же { matches: [...] } — полный актуальный список.
interface RawOpenMatchPerson {
  display_name?: string
  displayName?: string
  city?: string | null
  skill_level?: string | number
  skillLevel?: string | number
  rating?: number | string
  avatar_path?: string | null
  avatarPath?: string | null
}

interface RawOpenMatchParticipant extends RawOpenMatchPerson {
  isOrganizer?: boolean
  is_organizer?: boolean
}

interface RawOpenMatch {
  id: string
  booking_id?: string
  bookingId?: string
  capacity: number | string
  participants_count?: number
  participantsCount?: number
  available_spots?: number
  availableSpots?: number
  is_current_user_participant?: boolean
  isCurrentUserParticipant?: boolean
  court_name?: string
  courtName?: string
  booking_date?: string
  bookingDate?: string
  start_time?: string
  startTime?: string
  end_time?: string
  endTime?: string
  organizer?: RawOpenMatchPerson | null
  participants?: RawOpenMatchParticipant[]
}

function toOpenMatchOrganizer(raw: RawOpenMatchPerson | null | undefined): OpenMatchOrganizer | null {
  if (!raw) return null

  const avatarPath = raw.avatar_path ?? raw.avatarPath ?? null

  return {
    displayName: raw.display_name ?? raw.displayName ?? '',
    city: raw.city ? String(raw.city) : null,
    skillLevel: normalizeSkillLevel(raw.skill_level ?? raw.skillLevel),
    rating: Number(raw.rating ?? 0) || 0,
    avatarUrl: buildAvatarUrl(avatarPath),
  }
}

function toOpenMatchParticipant(raw: RawOpenMatchParticipant): OpenMatchParticipant {
  const avatarPath = raw.avatar_path ?? raw.avatarPath ?? null
  const rawSkillLevel = raw.skill_level ?? raw.skillLevel

  return {
    isOrganizer: Boolean(raw.isOrganizer ?? raw.is_organizer ?? false),
    displayName: raw.display_name ?? raw.displayName ?? '',
    skillLevel: rawSkillLevel != null ? normalizeSkillLevel(rawSkillLevel) : null,
    rating: raw.rating != null ? Number(raw.rating) || 0 : null,
    avatarUrl: buildAvatarUrl(avatarPath),
  }
}

function toOpenMatch(raw: RawOpenMatch): OpenMatch {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id ?? raw.bookingId ?? ''),
    capacity: Number(raw.capacity) === 2 ? 2 : 4,
    participantsCount: Number(raw.participants_count ?? raw.participantsCount ?? 0) || 0,
    availableSpots: Number(raw.available_spots ?? raw.availableSpots ?? 0) || 0,
    isCurrentUserParticipant: Boolean(
      raw.is_current_user_participant ?? raw.isCurrentUserParticipant ?? false,
    ),
    courtName: raw.court_name ?? raw.courtName ?? 'Корт',
    dateKey: raw.booking_date ?? raw.bookingDate ?? '',
    startTime: String(raw.start_time ?? raw.startTime ?? '').slice(0, 5),
    endTime: String(raw.end_time ?? raw.endTime ?? '').slice(0, 5),
    organizer: toOpenMatchOrganizer(raw.organizer),
    participants: (raw.participants ?? []).map(toOpenMatchParticipant),
  }
}

async function callOpenMatches(extraBody: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error(OPEN_MATCHES_NOT_IN_TELEGRAM_MESSAGE)
  }

  return supabase.functions.invoke('open-matches', {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: { initData, ...extraBody },
  })
}

function extractOpenMatches(data: unknown): RawOpenMatch[] {
  const wrapped = data as { matches?: unknown } | null
  return Array.isArray(wrapped?.matches) ? (wrapped as { matches: RawOpenMatch[] }).matches : []
}

export async function fetchOpenMatches(): Promise<OpenMatch[]> {
  const { data, error } = await callOpenMatches({ action: 'list' })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return extractOpenMatches(data).map(toOpenMatch)
}

export async function createOpenMatch(bookingId: string, capacity: 2 | 4): Promise<OpenMatch[]> {
  const { data, error } = await callOpenMatches({ action: 'create', bookingId, capacity })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return extractOpenMatches(data).map(toOpenMatch)
}

export async function joinOpenMatch(matchId: string): Promise<OpenMatch[]> {
  const { data, error } = await callOpenMatches({ action: 'join', matchId })

  if (error) {
    throw new Error(await resolveFunctionErrorMessage(error))
  }

  return extractOpenMatches(data).map(toOpenMatch)
}
