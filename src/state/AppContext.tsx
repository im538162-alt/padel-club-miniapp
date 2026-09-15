import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TIME_SLOTS } from '../data/constants'
import { buildSeedGames } from '../data/games'
import { createBooking, fetchBookingsForDate, fetchCourts, type RemoteBooking } from '../lib/api'
import { toDateKey } from '../utils/date'
import { getTelegramWebApp, resolveDisplayName } from '../utils/telegram'
import type { CourtInfo, Game, Slot, TabId, UserBooking } from '../types'
import { AppContext, type AppContextValue } from './context'

export function AppProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => new Date(), [])
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today))
  const [userBookings, setUserBookings] = useState<UserBooking[]>([])
  const [userName] = useState(() => resolveDisplayName())
  const seedGames = useMemo(() => buildSeedGames(today), [today])

  useEffect(() => {
    getTelegramWebApp()?.ready()
  }, [])

  // Список кортов из Supabase. Загрузку считаем завершённой, когда courtsLoadedToken
  // догоняет courtsReloadToken — так не приходится дёргать setState синхронно в эффекте.
  const [courts, setCourts] = useState<CourtInfo[]>([])
  const [courtsError, setCourtsError] = useState<string | null>(null)
  const [courtsReloadToken, setCourtsReloadToken] = useState(0)
  const [courtsLoadedToken, setCourtsLoadedToken] = useState(-1)
  const courtsLoading = courtsLoadedToken !== courtsReloadToken

  useEffect(() => {
    let cancelled = false

    fetchCourts()
      .then((data) => {
        if (cancelled) return
        setCourts(data)
        setCourtsError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setCourtsError(error instanceof Error ? error.message : 'Не удалось загрузить список кортов')
      })
      .finally(() => {
        if (!cancelled) setCourtsLoadedToken(courtsReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [courtsReloadToken])

  // Бронирования из Supabase за выбранную дату. Тот же приём: сравниваем "запрошенный"
  // и "загруженный" ключ запроса вместо setState в начале эффекта.
  const [remoteBookings, setRemoteBookings] = useState<RemoteBooking[]>([])
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [bookingsReloadToken, setBookingsReloadToken] = useState(0)
  const [bookingsLoadedKey, setBookingsLoadedKey] = useState<string | null>(null)
  const bookingsRequestKey = `${selectedDateKey}:${bookingsReloadToken}`
  const bookingsLoading = bookingsLoadedKey !== bookingsRequestKey

  useEffect(() => {
    let cancelled = false
    const requestKey = bookingsRequestKey

    fetchBookingsForDate(selectedDateKey)
      .then((data) => {
        if (cancelled) return
        setRemoteBookings(data)
        setBookingsError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setBookingsError(error instanceof Error ? error.message : 'Не удалось загрузить бронирования')
      })
      .finally(() => {
        if (!cancelled) setBookingsLoadedKey(requestKey)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestKey производный от тех же зависимостей
  }, [selectedDateKey, bookingsReloadToken])

  const getSlotsForCourt = (dateKey: string, courtId: number): Slot[] =>
    TIME_SLOTS.map((time) => {
      const localBooking = userBookings.find(
        (b) => b.dateKey === dateKey && b.courtId === courtId && b.time === time,
      )
      if (localBooking) {
        return { time, status: 'booked', opponent: 'Игра с друзьями' }
      }

      const isRemoteBooked =
        dateKey === selectedDateKey &&
        remoteBookings.some((b) => b.courtId === courtId && b.time === time)
      if (isRemoteBooked) {
        return { time, status: 'booked' }
      }

      return { time, status: 'free' }
    })

  // Бронь создаётся на сервере через Edge Function create-booking (никаких прямых
  // insert в bookings из браузера). При успехе добавляем игру локально для
  // «Моих игр» и перезапрашиваем занятость кортов из Supabase.
  const bookSlot = async (dateKey: string, courtId: number, time: string) => {
    await createBooking({ courtId, bookingDate: dateKey, startTime: time })

    setUserBookings((prev) => [
      ...prev,
      {
        id: `${dateKey}-${courtId}-${time}-${Date.now()}`,
        dateKey,
        courtId,
        time,
        createdAt: Date.now(),
      },
    ])

    setBookingsReloadToken((n) => n + 1)
  }

  const games = useMemo<Game[]>(() => {
    const todayKey = toDateKey(today)
    const fromBookings: Game[] = userBookings.map((b) => ({
      id: b.id,
      dateKey: b.dateKey,
      time: b.time,
      courtName: courts.find((c) => c.id === b.courtId)?.name ?? `Корт ${b.courtId}`,
      opponent: 'Игра с друзьями',
      isUpcoming: b.dateKey >= todayKey,
    }))

    return [...fromBookings, ...seedGames].sort(
      (a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`),
    )
  }, [userBookings, seedGames, today, courts])

  const value: AppContextValue = {
    activeTab,
    setActiveTab,
    today,
    selectedDateKey,
    setSelectedDateKey,
    getSlotsForCourt,
    bookSlot,
    games,
    userName,
    courts,
    courtsLoading,
    courtsError,
    bookingsLoading,
    bookingsError,
    reloadCourts: () => setCourtsReloadToken((n) => n + 1),
    reloadBookings: () => setBookingsReloadToken((n) => n + 1),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
