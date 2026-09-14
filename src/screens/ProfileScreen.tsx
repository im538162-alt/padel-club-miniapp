import { useAppContext } from '../state/context'

const PROFILE = {
  rating: 2050,
  played: 24,
  wins: 16,
}

export function ProfileScreen() {
  const { userName } = useAppContext()
  const winRate = Math.round((PROFILE.wins / PROFILE.played) * 100)

  return (
    <div className="screen">
      <h1 className="screen__title">Профиль</h1>

      <div className="profile-card">
        <div className="profile-card__avatar">{userName.charAt(0).toUpperCase()}</div>
        <div className="profile-card__name">{userName}</div>
        <div className="profile-card__rating">Рейтинг: {PROFILE.rating}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-tile">
          <div className="stat-tile__value">{PROFILE.played}</div>
          <div className="stat-tile__label">Сыграно игр</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{PROFILE.wins}</div>
          <div className="stat-tile__label">Победы</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{winRate}%</div>
          <div className="stat-tile__label">Процент побед</div>
        </div>
      </div>

      <button type="button" className="btn btn--primary btn--full">
        Редактировать профиль
      </button>
    </div>
  )
}
