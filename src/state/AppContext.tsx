import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TIME_SLOTS } from '../data/constants'
import {
  cancelBooking,
  createBooking,
  fetchBookingsForDate,
  fetchCourts,
  fetchMyBookings,
  type MyBookingRow,
  type RemoteBooking,
} from '../lib/api'
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

  // «Мои игры» из Edge Function my-bookings — единственный источник данных
  // для этого экрана, локальных/демо записей больше нет.
  const [myBookingsRaw, setMyBookingsRaw] = useState<MyBookingRow[]>([])
  const [myGamesError, setMyGamesError] = useState<string | null>(null)
  const [myGamesReloadToken, setMyGamesReloadToken] = useState(0)
  const [myGamesLoadedToken, setMyGamesLoadedToken] = useState(-1)
  const myGamesLoading = myGamesLoadedToken !== myGamesReloadToken

  useEffect(() => {
    let cancelled = false

    fetchMyBookings()
      .then((data) => {
        if (cancelled) return
        setMyBookingsRaw(data)
        setMyGamesError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setMyGamesError(error instanceof Error ? error.message : 'Не удалось загрузить ваши игры')
      })
      .finally(() => {
        if (!cancelled) setMyGamesLoadedToken(myGamesReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [myGamesReloadToken])

  const myGames = useMemo<Game[]>(() => {
    const nowMs = today.getTime()

    return myBookingsRaw
      .map((row) => ({
        id: row.id,
        dateKey: row.dateKey,
        time: row.time,
        courtName: row.courtName,
        isUpcoming: new Date(`${row.dateKey}T${row.time}:00`).getTime() >= nowMs,
      }))
      .sort((a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`))
  }, [myBookingsRaw, today])

  const reloadCourts = () => setCourtsReloadToken((n) => n + 1)
  const reloadBookings = () => setBookingsReloadToken((n) => n + 1)
  const reloadMyGames = () => setMyGamesReloadToken((n) => n + 1)

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

  // Бронь создаётся на сервере через Edge Function create-booking-v2 (никаких прямых
  // insert в bookings из браузера). userBookings — только для мгновенного
  // оптимистичного статуса корта на «Главной», пока не подтянулась занятость из
  // Supabase. При успехе также перезапрашиваем занятость кортов и «Мои игры».
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

    reloadBookings()
    reloadMyGames()
  }

  // Отмена брони — тоже через Edge Function (cancel-booking), без прямых
  // изменений в таблице bookings. bookSlot никогда не убирал запись из
  // userBookings, поэтому без этой очистки локальный оптимистичный статус
  // «Занят» переживал отмену и держал слот перечёркнутым до перезапуска —
  // здесь убираем именно ту запись, что соответствует отменённой игре.
  const cancelMyGame = async (game: Game) => {
    await cancelBooking({ bookingId: game.id })

    setUserBookings((prev) =>
      prev.filter((b) => {
        const courtName = courts.find((c) => c.id === b.courtId)?.name ?? `Корт ${b.courtId}`
        return !(b.dateKey === game.dateKey && b.time === game.time && courtName === game.courtName)
      }),
    )

    reloadMyGames()
    reloadBookings()
  }

  const value: AppContextValue = {
    activeTab,
    setActiveTab,
    today,
    selectedDateKey,
    setSelectedDateKey,
    getSlotsForCourt,
    bookSlot,
    userName,
    courts,
    courtsLoading,
    courtsError,
    bookingsLoading,
    bookingsError,
    reloadCourts,
    reloadBookings,
    myGames,
    myGamesLoading,
    myGamesError,
    reloadMyGames,
    cancelMyGame,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
