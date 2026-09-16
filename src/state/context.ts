import { createContext, useContext } from 'react'
import type { CourtInfo, Game, Slot, TabId } from '../types'

export interface AppContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  today: Date
  selectedDateKey: string
  setSelectedDateKey: (key: string) => void
  getSlotsForCourt: (dateKey: string, courtId: number) => Slot[]
  bookSlot: (dateKey: string, courtId: number, time: string) => Promise<void>
  userName: string
  courts: CourtInfo[]
  courtsLoading: boolean
  courtsError: string | null
  bookingsLoading: boolean
  bookingsError: string | null
  reloadCourts: () => void
  reloadBookings: () => void
  myGames: Game[]
  myGamesLoading: boolean
  myGamesError: string | null
  reloadMyGames: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
