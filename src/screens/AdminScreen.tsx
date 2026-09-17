import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CourtNameModal } from '../components/CourtNameModal'
import { StateNotice } from '../components/StateNotice'
import { useAppContext } from '../state/context'
import { formatDateWithWeekday } from '../utils/date'
import type { AdminCourt } from '../types'

interface Props {
  onBack: () => void
}

export function AdminScreen({ onBack }: Props) {
  const {
    adminDashboard,
    adminDashboardLoading,
    adminDashboardError,
    reloadAdminDashboard,
    createCourt,
    updateCourt,
  } = useAppContext()

  const [renameTarget, setRenameTarget] = useState<AdminCourt | null>(null)
  const [isAddingCourt, setIsAddingCourt] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<AdminCourt | null>(null)
  const [isTogglingCourt, setIsTogglingCourt] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const openToggleConfirm = (court: AdminCourt) => {
    setToggleError(null)
    setToggleTarget(court)
  }

  const dismissToggleConfirm = () => {
    if (isTogglingCourt) return
    setToggleTarget(null)
    setToggleError(null)
  }

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return

    setToggleError(null)
    setIsTogglingCourt(true)
    try {
      await updateCourt(toggleTarget.id, { active: !toggleTarget.active })
      setToggleTarget(null)
    } catch (error) {
      setToggleError(error instanceof Error ? error.message : 'Не удалось изменить статус корта')
    } finally {
      setIsTogglingCourt(false)
    }
  }

  return (
    <div className="screen">
      <div className="screen__header">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Назад
        </button>
        <h1 className="screen__title">Админ-панель</h1>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={reloadAdminDashboard}
          disabled={adminDashboardLoading}
        >
          {adminDashboardLoading ? 'Обновляем…' : 'Обновить'}
        </button>
      </div>

      {adminDashboardLoading && <StateNotice kind="loading" title="Загружаем данные…" />}

      {!adminDashboardLoading && adminDashboardError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить админ-панель"
          description={adminDashboardError}
          onRetry={reloadAdminDashboard}
        />
      )}

      {!adminDashboardLoading && !adminDashboardError && adminDashboard && (
        <>
          <div className="stats-grid">
            <div className="stat-tile">
              <div className="stat-tile__value">{adminDashboard.stats.activeCourts}</div>
              <div className="stat-tile__label">Активные корты</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value">{adminDashboard.stats.players}</div>
              <div className="stat-tile__label">Игроки</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value">{adminDashboard.stats.confirmedBookings}</div>
              <div className="stat-tile__label">Подтверждённые брони</div>
            </div>
          </div>

          <div className="section-title">Управление кортами</div>
          {adminDashboard.courts.length === 0 ? (
            <p className="empty-state">Корты пока не добавлены</p>
          ) : (
            <div className="court-list">
              {adminDashboard.courts.map((court) => (
                <div key={court.id} className={`court-card ${court.active ? 'is-free' : 'is-booked'}`}>
                  <div className="court-card__info">
                    <div className="court-card__name">{court.name}</div>
                    <div className="court-card__time">
                      {court.active ? 'Доступен для бронирования' : 'Скрыт из расписания'}
                    </div>
                  </div>
                  <div className="court-card__status-row">
                    <span
                      className={`status-badge ${court.active ? 'status-badge--free' : 'status-badge--booked'}`}
                    >
                      {court.active ? 'Активен' : 'Скрыт'}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => setRenameTarget(court)}
                    >
                      Переименовать
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => openToggleConfirm(court)}
                    >
                      {court.active ? 'Скрыть' : 'Включить'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn--ghost btn--full" onClick={() => setIsAddingCourt(true)}>
            Добавить корт
          </button>

          <div className="section-title">Последние бронирования</div>
          {adminDashboard.recentBookings.length === 0 ? (
            <p className="empty-state">Бронирований пока нет</p>
          ) : (
            <div className="game-list">
              {adminDashboard.recentBookings.map((booking) => (
                <div key={booking.id} className="game-card">
                  <div className="game-card__date">
                    <span className="game-card__day">{formatDateWithWeekday(booking.dateKey)}</span>
                    <span className="game-card__time">
                      {booking.startTime}–{booking.endTime}
                    </span>
                  </div>
                  <div className="game-card__body">
                    <div className="game-card__court">{booking.courtName}</div>
                    <div className="game-card__meta">{booking.playerName}</div>
                  </div>
                  <div className="game-card__status">
                    <span
                      className={`status-pill ${
                        booking.status === 'confirmed' ? 'status-pill--upcoming' : 'status-pill--cancelled'
                      }`}
                    >
                      {booking.status === 'confirmed' ? 'Подтверждена' : 'Отменена'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {renameTarget && (
        <CourtNameModal
          title="Переименовать корт"
          initialName={renameTarget.name}
          confirmLabel="Сохранить"
          confirmingLabel="Сохраняем…"
          onClose={() => setRenameTarget(null)}
          onSubmit={(name) => updateCourt(renameTarget.id, { name })}
        />
      )}

      {isAddingCourt && (
        <CourtNameModal
          title="Добавить корт"
          confirmLabel="Добавить"
          confirmingLabel="Добавляем…"
          onClose={() => setIsAddingCourt(false)}
          onSubmit={(name) => createCourt(name)}
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.active ? 'Скрыть корт' : 'Включить корт'}
          message={
            toggleTarget.active
              ? 'Скрыть корт? Новые бронирования для него будут недоступны. Существующие брони сохранятся.'
              : 'Включить корт? Он снова станет доступен для бронирования.'
          }
          confirmLabel={toggleTarget.active ? 'Скрыть' : 'Включить'}
          confirmingLabel={toggleTarget.active ? 'Скрываем…' : 'Включаем…'}
          cancelLabel="Отмена"
          isConfirming={isTogglingCourt}
          error={toggleError}
          onConfirm={handleToggleConfirm}
          onDismiss={dismissToggleConfirm}
        />
      )}
    </div>
  )
}
