import { formatDateWithWeekday } from '../utils/date'
import type { Game } from '../types'

interface Props {
  game: Game
}

export function GameCard({ game }: Props) {
  return (
    <div className={`game-card ${game.isUpcoming ? 'is-upcoming' : 'is-past'}`}>
      <div className="game-card__date">
        <span className="game-card__day">{formatDateWithWeekday(game.dateKey)}</span>
        <span className="game-card__time">{game.time}</span>
      </div>
      <div className="game-card__body">
        <div className="game-card__court">{game.courtName}</div>
        <div className="game-card__opponent">{game.opponent}</div>
      </div>
      <div className="game-card__status">
        {game.isUpcoming ? (
          <span className="status-pill status-pill--upcoming">Предстоит</span>
        ) : game.result === 'win' ? (
          <span className="status-pill status-pill--win">Победа</span>
        ) : game.result === 'loss' ? (
          <span className="status-pill status-pill--loss">Поражение</span>
        ) : (
          <span className="status-pill">Завершена</span>
        )}
      </div>
    </div>
  )
}
