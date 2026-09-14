export type TabId = 'home' | 'games' | 'rating' | 'profile'

export type SlotStatus = 'free' | 'booked'

export interface Slot {
  time: string
  status: SlotStatus
  opponent?: string
}

export interface CourtInfo {
  id: number
  name: string
}

export interface UserBooking {
  id: string
  dateKey: string
  courtId: number
  time: string
  createdAt: number
}

export type GameResult = 'win' | 'loss' | null

export interface Game {
  id: string
  dateKey: string
  time: string
  courtName: string
  opponent: string
  isUpcoming: boolean
  result?: GameResult
}

export interface Player {
  id: string
  name: string
  rating: number
  isCurrentUser?: boolean
}
