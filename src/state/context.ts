import { createContext, useContext } from 'react'
import type { CourtInfo, Game, PlayerProfile, SkillLevel, Slot, TabId } from '../types'

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
  cancelMyGame: (game: Game) => Promise<void>
  profile: PlayerProfile | null
  profileLoading: boolean
  profileError: string | null
  reloadProfile: () => void
  updateProfile: (input: { displayName: string; city: string; skillLevel: SkillLevel }) => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
