import { createContext, useContext } from 'react'
import type { Game, Slot, TabId } from '../types'

export interface AppContextValue {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  today: Date
  selectedDateKey: string
  setSelectedDateKey: (key: string) => void
  getSlotsForCourt: (dateKey: string, courtId: number) => Slot[]
  bookSlot: (dateKey: string, courtId: number, time: string) => void
  games: Game[]
  userName: string
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
