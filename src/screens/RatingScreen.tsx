import { StateNotice } from '../components/StateNotice'
import { SKILL_LEVEL_LABELS } from '../data/skillLevels'
import { useAppContext } from '../state/context'

export function RatingScreen() {
  const { leaderboard, leaderboardLoading, leaderboardError, reloadLeaderboard } = useAppContext()

  return (
    <div className="screen">
      <h1 className="screen__title">Рейтинг игроков</h1>

      {leaderboardLoading && <StateNotice kind="loading" title="Загружаем рейтинг…" />}

      {!leaderboardLoading && leaderboardError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить рейтинг"
          description={leaderboardError}
          onRetry={reloadLeaderboard}
        />
      )}

      {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
        <p className="empty-state">Рейтинг пока пуст</p>
      )}

      {!leaderboardLoading && !leaderboardError && leaderboard.length > 0 && (
        <div className="rating-list">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`rating-row ${entry.isCurrentUser ? 'is-current' : ''}`}
            >
              <div className="rating-row__place">{entry.rank}</div>
              <div className="rating-row__avatar">{(entry.displayName.charAt(0) || '?').toUpperCase()}</div>
              <div className="rating-row__info">
                <div className="rating-row__name">{entry.displayName}</div>
                <div className="rating-row__level">{SKILL_LEVEL_LABELS[entry.skillLevel]}</div>
              </div>
              <div className="rating-row__rating">{entry.rating.toFixed(1)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
