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

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

// Профиль игрока — приходит из Edge Function player-profile.
export interface PlayerProfile {
  displayName: string
  city: string | null
  skillLevel: SkillLevel
  rating: number
  avatarPath: string | null
  avatarUrl: string | null
}

// Строка рейтинга — приходит только из Edge Function player-leaderboard,
// без демо-игроков.
export interface LeaderboardEntry {
  rank: number
  displayName: string
  skillLevel: SkillLevel
  rating: number
  isCurrentUser: boolean
}

export type AdminBookingStatus = 'confirmed' | 'cancelled'

export interface AdminBookingRow {
  id: string
  courtName: string
  dateKey: string
  startTime: string
  endTime: string
  status: AdminBookingStatus
  playerName: string
  createdAt: string
}

// Данные админ-панели — приходят только из Edge Function admin-dashboard,
// доступной исключительно внутри Telegram админам приложения.
export interface AdminDashboard {
  stats: {
    activeCourts: number
    players: number
    confirmedBookings: number
  }
  recentBookings: AdminBookingRow[]
}
