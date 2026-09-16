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

// Запись «Моих игр» — приходит только из Edge Function my-bookings,
// без выдуманных соперников или результатов.
export interface Game {
  id: string
  dateKey: string
  time: string
  courtName: string
  isUpcoming: boolean
}

export interface Player {
  id: string
  name: string
  rating: number
  isCurrentUser?: boolean
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

// Профиль игрока — приходит из Edge Function player-profile.
export interface PlayerProfile {
  displayName: string
  city: string | null
  skillLevel: SkillLevel
  rating: number
}
