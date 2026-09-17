import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { SLOT_DURATION_MINUTES, TIME_SLOTS } from '../data/constants'
import {
  cancelBooking,
  createAdminCourt,
  createBooking,
  createOpenMatch as apiCreateOpenMatch,
  fetchAdminDashboard,
  fetchBookingsForDate,
  fetchCourts,
  fetchLeaderboard,
  fetchMyBookings,
  fetchOpenMatches,
  fetchPlayerProfile,
  joinOpenMatch as apiJoinOpenMatch,
  updateAdminCourt,
  updatePlayerProfile,
  uploadProfileAvatar,
  type MyBookingRow,
  type RemoteBooking,
} from '../lib/api'
import { timeToMinutes, toDateKey } from '../utils/date'
import { getTelegramInitData, getTelegramWebApp, resolveDisplayName } from '../utils/telegram'
import type {
  AdminDashboard,
  CourtInfo,
  Game,
  LeaderboardEntry,
  OpenMatch,
  PlayerProfile,
  SkillLevel,
  Slot,
  TabId,
  UserBooking,
} from '../types'
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

  // Профиль игрока из Edge Function player-profile — тот же приём с "загруженным"
  // токеном, чтобы не дёргать setState синхронно в начале эффекта.
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileReloadToken, setProfileReloadToken] = useState(0)
  const [profileLoadedToken, setProfileLoadedToken] = useState(-1)
  const profileLoading = profileLoadedToken !== profileReloadToken

  useEffect(() => {
    let cancelled = false

    fetchPlayerProfile()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setProfileError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setProfileError(error instanceof Error ? error.message : 'Не удалось загрузить профиль')
      })
      .finally(() => {
        if (!cancelled) setProfileLoadedToken(profileReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [profileReloadToken])

  // Рейтинг игроков из Edge Function player-leaderboard — тот же приём с
  // "загруженным" токеном вместо setState в начале эффекта.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [leaderboardReloadToken, setLeaderboardReloadToken] = useState(0)
  const [leaderboardLoadedToken, setLeaderboardLoadedToken] = useState(-1)
  const leaderboardLoading = leaderboardLoadedToken !== leaderboardReloadToken

  useEffect(() => {
    let cancelled = false

    fetchLeaderboard()
      .then((data) => {
        if (cancelled) return
        setLeaderboard(data)
        setLeaderboardError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLeaderboardError(error instanceof Error ? error.message : 'Не удалось загрузить рейтинг')
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoadedToken(leaderboardReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [leaderboardReloadToken])

  // Админ-панель из Edge Function admin-dashboard — доступна только внутри
  // Telegram и только администраторам. Вне Telegram проверку не выполняем
  // вовсе (isAdmin остаётся false, запрос не уходит). 403 от функции значит
  // «не админ» — это не ошибка, поэтому adminDashboardError не выставляется,
  // просто isAdmin становится false. Всё завёрнуто в Promise-цепочку (а не
  // синхронный if в начале эффекта), чтобы setState всегда происходил внутри
  // .then/.catch/.finally — тот же приём, что и в остальных эффектах здесь.
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminDashboardError, setAdminDashboardError] = useState<string | null>(null)
  const [adminDashboardReloadToken, setAdminDashboardReloadToken] = useState(0)
  const [adminDashboardLoadedToken, setAdminDashboardLoadedToken] = useState(-1)
  const adminDashboardLoading = adminDashboardLoadedToken !== adminDashboardReloadToken

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(() => (getTelegramInitData() ? fetchAdminDashboard() : undefined))
      .then((data) => {
        if (cancelled || data === undefined) return
        if (data === null) {
          setIsAdmin(false)
          setAdminDashboard(null)
        } else {
          setIsAdmin(true)
          setAdminDashboard(data)
        }
        setAdminDashboardError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setAdminDashboardError(
          error instanceof Error ? error.message : 'Не удалось загрузить админ-панель',
        )
      })
      .finally(() => {
        if (!cancelled) setAdminDashboardLoadedToken(adminDashboardReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [adminDashboardReloadToken])

  // Открытые игры из Edge Function open-matches — доступны только внутри
  // Telegram, вне его не запрашиваем вовсе (тот же приём, что и для admin
  // dashboard: Promise-цепочка, чтобы не дёргать setState синхронно в эффекте).
  const [openMatches, setOpenMatches] = useState<OpenMatch[]>([])
  const [openMatchesError, setOpenMatchesError] = useState<string | null>(null)
  const [openMatchesReloadToken, setOpenMatchesReloadToken] = useState(0)
  const [openMatchesLoadedToken, setOpenMatchesLoadedToken] = useState(-1)
  const openMatchesLoading = openMatchesLoadedToken !== openMatchesReloadToken

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(() => (getTelegramInitData() ? fetchOpenMatches() : undefined))
      .then((data) => {
        if (cancelled || data === undefined) return
        setOpenMatches(data)
        setOpenMatchesError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setOpenMatchesError(
          error instanceof Error ? error.message : 'Не удалось загрузить открытые игры',
        )
      })
      .finally(() => {
        if (!cancelled) setOpenMatchesLoadedToken(openMatchesReloadToken)
      })

    return () => {
      cancelled = true
    }
  }, [openMatchesReloadToken])

  const reloadCourts = () => setCourtsReloadToken((n) => n + 1)
  const reloadBookings = () => setBookingsReloadToken((n) => n + 1)
  const reloadMyGames = () => setMyGamesReloadToken((n) => n + 1)
  const reloadProfile = () => setProfileReloadToken((n) => n + 1)
  const reloadLeaderboard = () => setLeaderboardReloadToken((n) => n + 1)
  const reloadAdminDashboard = () => setAdminDashboardReloadToken((n) => n + 1)
  const reloadOpenMatches = () => setOpenMatchesReloadToken((n) => n + 1)

  const todayKey = toDateKey(today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  // Для сегодняшней даты уже прошедшее время не показываем вовсе — его нельзя
  // забронировать, так что нет смысла предлагать его в списке.
  const getSlotsForCourt = (dateKey: string, courtId: number): Slot[] => {
    const relevantTimes =
      dateKey === todayKey ? TIME_SLOTS.filter((time) => timeToMinutes(time) > nowMinutes) : TIME_SLOTS

    return relevantTimes.map((time) => {
      const localBooking = userBookings.find(
        (b) => b.dateKey === dateKey && b.courtId === courtId && b.time === time,
      )
      if (localBooking) {
        return { time, status: 'booked', opponent: 'Игра с друзьями' }
      }

      // Слот длится SLOT_DURATION_MINUTES (1 час) и считается занятым, если
      // пересекается с интервалом [start_time, end_time) любой активной брони
      // того же корта — не только при точном совпадении времени начала.
      if (dateKey === selectedDateKey) {
        const slotStart = timeToMinutes(time)
        const slotEnd = slotStart + SLOT_DURATION_MINUTES
        const isRemoteBooked = remoteBookings.some(
          (b) =>
            b.courtId === courtId &&
            timeToMinutes(b.startTime) < slotEnd &&
            timeToMinutes(b.endTime) > slotStart,
        )
        if (isRemoteBooked) {
          return { time, status: 'booked' }
        }
      }

      return { time, status: 'free' }
    })
  }

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

  // Сохранение профиля идёт через Edge Function player-profile (action: 'update'),
  // рейтинг при этом не отправляется — он read-only и считается только на сервере.
  // После успеха просто перезапрашиваем профиль, а не доверяем локальному вводу.
  const updateProfile = async (input: { displayName: string; city: string; skillLevel: SkillLevel }) => {
    await updatePlayerProfile(input)
    reloadProfile()
  }

  // Фото загружается через Edge Function upload-avatar (data URL в body, без прямой
  // записи в Storage с клиента). После успеха перезапрашиваем профиль, чтобы
  // подтянулся новый avatar_path/avatarUrl.
  const uploadAvatar = async (file: File) => {
    await uploadProfileAvatar(file)
    reloadProfile()
  }

  // createCourt/updateCourt — тоже через admin-dashboard. Функция сама
  // возвращает полный обновлённый dashboard, поэтому сохраняем его напрямую
  // из ответа, не делая лишний повторный запрос через reloadAdminDashboard.
  const createCourt = async (name: string) => {
    const dashboard = await createAdminCourt(name)
    setAdminDashboard(dashboard)
  }

  const updateCourt = async (courtId: number, updates: { name?: string; active?: boolean }) => {
    const dashboard = await updateAdminCourt(courtId, updates)
    setAdminDashboard(dashboard)
  }

  // createOpenMatch/joinOpenMatch тоже возвращают полный актуальный список
  // открытых игр — сохраняем его напрямую, без отдельного reloadOpenMatches.
  const createOpenMatch = async (bookingId: string, capacity: 2 | 4) => {
    const matches = await apiCreateOpenMatch(bookingId, capacity)
    setOpenMatches(matches)
  }

  const joinOpenMatch = async (matchId: string) => {
    const matches = await apiJoinOpenMatch(matchId)
    setOpenMatches(matches)
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
    profile,
    profileLoading,
    profileError,
    reloadProfile,
    updateProfile,
    uploadAvatar,
    leaderboard,
    leaderboardLoading,
    leaderboardError,
    reloadLeaderboard,
    adminDashboard,
    adminDashboardLoading,
    adminDashboardError,
    isAdmin,
    reloadAdminDashboard,
    createCourt,
    updateCourt,
    openMatches,
    openMatchesLoading,
    openMatchesError,
    reloadOpenMatches,
    createOpenMatch,
    joinOpenMatch,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
