import { useState } from 'react'
import { formatDateWithWeekday } from '../utils/date'
import { useAppContext } from '../state/context'
import { ConfirmDialog } from './ConfirmDialog'
import type { Game } from '../types'

interface Props {
  game: Game
}

export function GameCard({ game }: Props) {
  const { cancelMyGame } = useAppContext()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const handleCancel = async () => {
    setCancelError(null)
    setIsCancelling(true)
    try {
      await cancelMyGame(game.id)
      setShowConfirm(false)
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Не удалось отменить бронирование')
    } finally {
      setIsCancelling(false)
    }
  }

  const openConfirm = () => {
    setCancelError(null)
    setShowConfirm(true)
  }

  const dismissConfirm = () => {
    if (isCancelling) return
    setShowConfirm(false)
    setCancelError(null)
  }

  return (
    <>
      <div className={`game-card ${game.isUpcoming ? 'is-upcoming' : 'is-past'}`}>
        <div className="game-card__date">
          <span className="game-card__day">{formatDateWithWeekday(game.dateKey)}</span>
          <span className="game-card__time">{game.time}</span>
        </div>
        <div className="game-card__body">
          <div className="game-card__court">{game.courtName}</div>
        </div>
        <div className="game-card__status">
          {game.isUpcoming ? (
            <>
              <span className="status-pill status-pill--upcoming">Забронировано</span>
              <button type="button" className="btn btn--ghost btn--small" onClick={openConfirm}>
                Отменить
              </button>
            </>
          ) : (
            <span className="status-pill">Прошла</span>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Отмена брони"
          message="Отменить бронирование? Слот снова станет свободным."
          confirmLabel="Отменить бронирование"
          confirmingLabel="Отменяем…"
          isConfirming={isCancelling}
          error={cancelError}
          onConfirm={handleCancel}
          onDismiss={dismissConfirm}
        />
      )}
    </>
  )
}
