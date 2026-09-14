import { PLAYERS } from '../data/players'

export function RatingScreen() {
  const sorted = [...PLAYERS].sort((a, b) => b.rating - a.rating)

  return (
    <div className="screen">
      <h1 className="screen__title">Рейтинг игроков</h1>
      <div className="rating-list">
        {sorted.map((player, index) => (
          <div key={player.id} className={`rating-row ${player.isCurrentUser ? 'is-current' : ''}`}>
            <div className="rating-row__place">{index + 1}</div>
            <div className="rating-row__avatar">{player.name.charAt(0)}</div>
            <div className="rating-row__name">{player.name}</div>
            <div className="rating-row__rating">{player.rating}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
