import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { COURTS, OPPONENT_NAMES, TIME_SLOTS } from '../data/constants'
import { buildSeedGames } from '../data/games'
import { toDateKey } from '../utils/date'
import { pickSeeded, seededRatio } from '../utils/random'
import { getTelegramWebApp, resolveDisplayName } from '../utils/telegram'
import type { Game, Slot, TabId, UserBooking } from '../types'
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

  const getSlotsForCourt = (dateKey: string, courtId: number): Slot[] =>
    TIME_SLOTS.map((time) => {
      const booking = userBookings.find(
        (b) => b.dateKey === dateKey && b.courtId === courtId && b.time === time,
      )
      if (booking) {
        return { time, status: 'booked', opponent: 'Игра с друзьями' }
      }

      const seed = `${dateKey}-${courtId}-${time}`
      if (seededRatio(seed) < 0.4) {
        return { time, status: 'booked', opponent: pickSeeded(seed, OPPONENT_NAMES) }
      }

      return { time, status: 'free' }
    })

  const bookSlot = (dateKey: string, courtId: number, time: string) => {
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
  }

  const games = useMemo<Game[]>(() => {
    const todayKey = toDateKey(today)
    const fromBookings: Game[] = userBookings.map((b) => ({
      id: b.id,
      dateKey: b.dateKey,
      time: b.time,
      courtName: COURTS.find((c) => c.id === b.courtId)?.name ?? `Корт ${b.courtId}`,
      opponent: 'Игра с друзьями',
      isUpcoming: b.dateKey >= todayKey,
    }))

    return [...fromBookings, ...seedGames].sort(
      (a, b) => `${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`),
    )
  }, [userBookings, seedGames, today])

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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
