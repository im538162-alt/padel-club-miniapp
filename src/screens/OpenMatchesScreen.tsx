import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateNotice } from '../components/StateNotice'
import { SKILL_LEVEL_LABELS } from '../data/skillLevels'
import { useAppContext } from '../state/context'
import { formatDateWithWeekday } from '../utils/date'
import type { OpenMatch } from '../types'

interface Props {
  onBack: () => void
}

export function OpenMatchesScreen({ onBack }: Props) {
  const {
    openMatches,
    openMatchesLoading,
    openMatchesError,
    reloadOpenMatches,
    joinOpenMatch,
    openMatchRoles,
    leaveOpenMatch,
    cancelOpenMatch,
  } = useAppContext()

  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<{ matchId: string; message: string } | null>(null)

  const [leaveTarget, setLeaveTarget] = useState<OpenMatch | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const [cancelTarget, setCancelTarget] = useState<OpenMatch | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

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

  const openLeaveConfirm = (match: OpenMatch) => {
    setLeaveError(null)
    setLeaveTarget(match)
  }

  const dismissLeaveConfirm = () => {
    if (isLeaving) return
    setLeaveTarget(null)
    setLeaveError(null)
  }

  const handleLeaveConfirm = async () => {
    if (!leaveTarget) return

    setLeaveError(null)
    setIsLeaving(true)
    try {
      await leaveOpenMatch(leaveTarget.id)
      setLeaveTarget(null)
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : 'Не удалось выйти из игры')
    } finally {
      setIsLeaving(false)
    }
  }

  const openCancelConfirm = (match: OpenMatch) => {
    setCancelError(null)
    setCancelTarget(match)
  }

  const dismissCancelConfirm = () => {
    if (isCancelling) return
    setCancelTarget(null)
    setCancelError(null)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return

    setCancelError(null)
    setIsCancelling(true)
    try {
      await cancelOpenMatch(cancelTarget.id)
      setCancelTarget(null)
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Не удалось отменить игру')
    } finally {
      setIsCancelling(false)
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
            const role = match.isCurrentUserParticipant
              ? (openMatchRoles[match.id] ?? 'participant')
              : null

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

                  {match.participants.length > 0 && (
                    <>
                      <div className="section-title">Участники</div>
                      <div className="rating-list">
                        {match.participants.map((participant, index) => (
                          <div key={index} className="rating-row">
                            {participant.avatarUrl ? (
                              <img
                                className="rating-row__avatar rating-row__avatar--photo"
                                src={participant.avatarUrl}
                                alt=""
                              />
                            ) : (
                              <div className="rating-row__avatar">
                                {(participant.displayName.charAt(0) || '?').toUpperCase()}
                              </div>
                            )}
                            <div className="rating-row__info">
                              <div className="rating-row__name">{participant.displayName}</div>
                              <div className="rating-row__level">
                                {participant.isOrganizer ? 'Организатор' : 'Участник'}
                                {participant.skillLevel
                                  ? ` · ${SKILL_LEVEL_LABELS[participant.skillLevel]}`
                                  : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {matchJoinError && (
                    <StateNotice
                      kind="error"
                      title="Не удалось присоединиться"
                      description={matchJoinError}
                    />
                  )}
                </div>
                <div className="game-card__status">
                  {role === 'organizer' ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => openCancelConfirm(match)}
                    >
                      Отменить игру
                    </button>
                  ) : role === 'participant' ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => openLeaveConfirm(match)}
                    >
                      Выйти из игры
                    </button>
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

      {leaveTarget && (
        <ConfirmDialog
          title="Выйти из игры?"
          message="Ваше место сразу станет доступно другим игрокам."
          confirmLabel="Выйти"
          confirmingLabel="Выходим…"
          isConfirming={isLeaving}
          error={leaveError}
          onConfirm={handleLeaveConfirm}
          onDismiss={dismissLeaveConfirm}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Отменить открытую игру?"
          message="Бронь будет отменена, а слот снова станет свободным."
          confirmLabel="Отменить игру"
          confirmingLabel="Отменяем…"
          isConfirming={isCancelling}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onDismiss={dismissCancelConfirm}
        />
      )}
    </div>
  )
}
