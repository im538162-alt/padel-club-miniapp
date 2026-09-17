import { useState } from 'react'
import { StateNotice } from '../components/StateNotice'
import { SKILL_LEVEL_LABELS } from '../data/skillLevels'
import { useAppContext } from '../state/context'
import { formatDateWithWeekday } from '../utils/date'

interface Props {
  onBack: () => void
}

export function OpenMatchesScreen({ onBack }: Props) {
  const { openMatches, openMatchesLoading, openMatchesError, reloadOpenMatches, joinOpenMatch } =
    useAppContext()
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<{ matchId: string; message: string } | null>(null)

  const handleJoin = async (matchId: string) => {
    setJoinError(null)
    setJoiningMatchId(matchId)
    try {
      await joinOpenMatch(matchId)
    } catch (error) {
      setJoinError({
        matchId,
        message: error instanceof Error ? error.message : 'Не удалось присоединиться',
      })
    } finally {
      setJoiningMatchId(null)
    }
  }

  return (
    <div className="screen">
      <div className="screen__header">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Назад
        </button>
        <h1 className="screen__title">Открытые игры</h1>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={reloadOpenMatches}
          disabled={openMatchesLoading}
        >
          {openMatchesLoading ? 'Обновляем…' : 'Обновить'}
        </button>
      </div>

      {openMatchesLoading && <StateNotice kind="loading" title="Загружаем открытые игры…" />}

      {!openMatchesLoading && openMatchesError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить открытые игры"
          description={openMatchesError}
          onRetry={reloadOpenMatches}
        />
      )}

      {!openMatchesLoading && !openMatchesError && openMatches.length === 0 && (
        <p className="empty-state">Открытых игр пока нет</p>
      )}

      {!openMatchesLoading && !openMatchesError && openMatches.length > 0 && (
        <div className="game-list">
          {openMatches.map((match) => {
            const isJoining = joiningMatchId === match.id
            const matchJoinError = joinError?.matchId === match.id ? joinError.message : null

            return (
              <div key={match.id} className="game-card">
                <div className="game-card__date">
                  <span className="game-card__day">{formatDateWithWeekday(match.dateKey)}</span>
                  <span className="game-card__time">
                    {match.startTime}–{match.endTime}
                  </span>
                </div>
                <div className="game-card__body">
                  <div className="game-card__court">{match.courtName}</div>
                  {match.organizer && (
                    <div className="game-card__meta">
                      Организатор: {match.organizer.displayName} ·{' '}
                      {SKILL_LEVEL_LABELS[match.organizer.skillLevel]} · {match.organizer.rating.toFixed(1)}
                    </div>
                  )}
                  <div className="game-card__meta">
                    {match.participantsCount} из {match.capacity} игроков
                    {match.availableSpots > 0 ? ` · Осталось мест: ${match.availableSpots}` : ''}
                  </div>
                  {matchJoinError && (
                    <StateNotice
                      kind="error"
                      title="Не удалось присоединиться"
                      description={matchJoinError}
                    />
                  )}
                </div>
                <div className="game-card__status">
                  {match.isCurrentUserParticipant ? (
                    <span className="status-pill status-pill--upcoming">Вы участвуете</span>
                  ) : match.availableSpots > 0 ? (
                    <button
                      type="button"
                      className="btn btn--primary btn--small"
                      onClick={() => handleJoin(match.id)}
                      disabled={isJoining}
                    >
                      {isJoining ? 'Присоединяемся…' : 'Присоединиться'}
                    </button>
                  ) : (
                    <span className="status-pill">Мест нет</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
