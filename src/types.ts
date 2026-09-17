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

export interface AdminCourt {
  id: number
  name: string
  active: boolean
}

// Данные админ-панели — приходят только из Edge Function admin-dashboard,
// доступной исключительно внутри Telegram админам приложения.
export interface AdminDashboard {
  stats: {
    activeCourts: number
    players: number
    confirmedBookings: number
  }
  courts: AdminCourt[]
  recentBookings: AdminBookingRow[]
}

export interface OpenMatchOrganizer {
  displayName: string
  city: string | null
  skillLevel: SkillLevel
  rating: number
  avatarUrl: string | null
}

export interface OpenMatchParticipant {
  isOrganizer: boolean
  displayName: string
  skillLevel: SkillLevel | null
  rating: number | null
  avatarUrl: string | null
}

// Открытая игра — приходит только из Edge Function open-matches,
// доступной исключительно внутри Telegram.
export interface OpenMatch {
  id: string
  bookingId: string
  capacity: 2 | 4
  participantsCount: number
  availableSpots: number
  isCurrentUserParticipant: boolean
  courtName: string
  dateKey: string
  startTime: string
  endTime: string
  organizer: OpenMatchOrganizer | null
  participants: OpenMatchParticipant[]
}

// Роль текущего пользователя в открытой игре — из Edge Function
// open-match-actions (action: 'roles'). Игра отсутствует в мапе, если
// пользователь в ней не участвует.
export type OpenMatchRole = 'organizer' | 'participant'

export interface MatchMessageSender {
  displayName: string
  avatarUrl: string | null
}

// Сообщение чата открытой игры — приходит только из Edge Function match-chat,
// доступной исключительно внутри Telegram участникам игры.
export interface MatchMessage {
  id: string
  body: string
  createdAt: string
  sender: MatchMessageSender
}
