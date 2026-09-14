import { GameCard } from '../components/GameCard'
import { useAppContext } from '../state/context'
import { toDateKey } from '../utils/date'

export function MyGamesScreen() {
  const { games, today } = useAppContext()
  const todayKey = toDateKey(today)

  const upcoming = games
    .filter((game) => game.dateKey >= todayKey)
    .sort((a, b) => `${a.dateKey}${a.time}`.localeCompare(`${b.dateKey}${b.time}`))
  const past = games
    .filter((game) => game.dateKey < todayKey)
    .sort((a, b) => `${b.dateKey}${b.time}`.localeCompare(`${a.dateKey}${a.time}`))

  return (
    <div className="screen">
      <h1 className="screen__title">Мои игры</h1>

      <div className="section-title">Ближайшие</div>
      {upcoming.length === 0 ? (
        <p className="empty-state">Нет предстоящих игр. Забронируйте корт на «Главной»!</p>
      ) : (
        <div className="game-list">
          {upcoming.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <div className="section-title">Прошедшие</div>
      {past.length === 0 ? (
        <p className="empty-state">Прошедших игр пока нет</p>
      ) : (
        <div className="game-list">
          {past.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}
