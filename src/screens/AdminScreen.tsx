import { StateNotice } from '../components/StateNotice'
import { useAppContext } from '../state/context'
import { formatDateWithWeekday } from '../utils/date'

interface Props {
  onBack: () => void
}

export function AdminScreen({ onBack }: Props) {
  const { adminDashboard, adminDashboardLoading, adminDashboardError, reloadAdminDashboard } =
    useAppContext()

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
    </div>
  )
}
