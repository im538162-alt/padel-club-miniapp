import { useState } from 'react'
import { BookingFlow } from '../components/BookingFlow'
import { CourtCard } from '../components/CourtCard'
import { DateSelector } from '../components/DateSelector'
import { COURTS } from '../data/constants'
import { useAppContext } from '../state/context'

export function HomeScreen() {
  const { today, selectedDateKey, setSelectedDateKey, getSlotsForCourt, bookSlot, userName } =
    useAppContext()
  const [bookingCourtId, setBookingCourtId] = useState<number | null>(null)

  const bookingCourt = COURTS.find((court) => court.id === bookingCourtId) ?? null

  return (
    <div className="screen home-screen">
      <div className="home-screen__greeting">
        <h1>Привет, {userName} 👋</h1>
        <p>Выбирай корт и время для игры</p>
      </div>

      <DateSelector today={today} selectedDateKey={selectedDateKey} onSelect={setSelectedDateKey} />

      <div className="section-title">Свободные корты</div>
      <div className="court-list">
        {COURTS.map((court) => (
          <CourtCard
            key={court.id}
            courtName={court.name}
            slots={getSlotsForCourt(selectedDateKey, court.id)}
            onBook={() => setBookingCourtId(court.id)}
          />
        ))}
      </div>

      {bookingCourt && (
        <BookingFlow
          courtName={bookingCourt.name}
          dateKey={selectedDateKey}
          slots={getSlotsForCourt(selectedDateKey, bookingCourt.id)}
          onClose={() => setBookingCourtId(null)}
          onConfirm={(time) => bookSlot(selectedDateKey, bookingCourt.id, time)}
        />
      )}
    </div>
  )
}
