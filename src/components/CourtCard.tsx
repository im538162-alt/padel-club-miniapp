import type { Slot } from '../types'

interface Props {
  courtName: string
  slots: Slot[]
  onBook: () => void
}

export function CourtCard({ courtName, slots, onBook }: Props) {
  const freeSlots = slots.filter((slot) => slot.status === 'free')
  const isFree = freeSlots.length > 0

  return (
    <div className={`court-card ${isFree ? 'is-free' : 'is-booked'}`}>
      <div className="court-card__info">
        <div className="court-card__name">{courtName}</div>
        <div className="court-card__time">
          {isFree ? `Ближайшее время: ${freeSlots[0].time}` : 'Свободных слотов нет'}
        </div>
      </div>
      <div className="court-card__status-row">
        <span className={`status-badge ${isFree ? 'status-badge--free' : 'status-badge--booked'}`}>
          {isFree ? 'Свободен' : 'Занят'}
        </span>
        {isFree && (
          <button type="button" className="btn btn--primary btn--small" onClick={onBook}>
            Забронировать
          </button>
        )}
      </div>
    </div>
  )
}
