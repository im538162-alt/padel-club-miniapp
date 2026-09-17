import { useState } from 'react'
import { BookingFlow } from '../components/BookingFlow'
import { CourtCard } from '../components/CourtCard'
import { DateSelector } from '../components/DateSelector'
import { StateNotice } from '../components/StateNotice'
import { useAppContext } from '../state/context'
import { getTelegramInitData } from '../utils/telegram'

interface Props {
  onOpenOpenMatches: () => void
}

export function HomeScreen({ onOpenOpenMatches }: Props) {
  const {
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
  } = useAppContext()
  const [bookingCourtId, setBookingCourtId] = useState<number | null>(null)
  const isTelegram = Boolean(getTelegramInitData())

  const bookingCourt = courts.find((court) => court.id === bookingCourtId) ?? null

  return (
    <div className="screen home-screen">
      <div className="home-screen__greeting">
        <h1>Привет, {userName} 👋</h1>
        <p>Выбирай корт и время для игры</p>
      </div>

      {isTelegram && (
        <button type="button" className="btn btn--ghost btn--full" onClick={onOpenOpenMatches}>
          Открытые игры
        </button>
      )}

      <DateSelector today={today} selectedDateKey={selectedDateKey} onSelect={setSelectedDateKey} />

      <div className="section-title">Свободные корты</div>

      {courtsLoading && <StateNotice kind="loading" title="Загружаем список кортов…" />}

      {!courtsLoading && courtsError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить корты"
          description={courtsError}
          onRetry={reloadCourts}
        />
      )}

      {!courtsLoading && !courtsError && (
        <>
          {bookingsError && (
            <StateNotice
              kind="error"
              title="Не удалось загрузить занятость кортов"
              description={bookingsError}
              onRetry={reloadBookings}
            />
          )}

          {bookingsLoading && !bookingsError && (
            <StateNotice kind="loading" title="Обновляем статус кортов…" />
          )}

          {!bookingsLoading && !bookingsError && courts.length === 0 && (
            <p className="empty-state">Корты пока не добавлены</p>
          )}

          {!bookingsLoading && !bookingsError && courts.length > 0 && (
            <div className="court-list">
              {courts.map((court) => (
                <CourtCard
                  key={court.id}
                  courtName={court.name}
                  slots={getSlotsForCourt(selectedDateKey, court.id)}
                  onBook={() => setBookingCourtId(court.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

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
