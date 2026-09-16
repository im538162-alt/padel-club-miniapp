import { useState } from 'react'
import { EditProfileModal } from '../components/EditProfileModal'
import { StateNotice } from '../components/StateNotice'
import { SKILL_LEVEL_LABELS } from '../data/skillLevels'
import { useAppContext } from '../state/context'

export function ProfileScreen() {
  const { profile, profileLoading, profileError, reloadProfile, updateProfile } = useAppContext()
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="screen">
      <h1 className="screen__title">Профиль</h1>

      {profileLoading && <StateNotice kind="loading" title="Загружаем профиль…" />}

      {!profileLoading && profileError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить профиль"
          description={profileError}
          onRetry={reloadProfile}
        />
      )}

      {!profileLoading && !profileError && profile && (
        <>
          <div className="profile-card">
            <div className="profile-card__avatar">
              {(profile.displayName.charAt(0) || '?').toUpperCase()}
            </div>
            <div className="profile-card__name">{profile.displayName}</div>
            <div className="profile-card__city">{profile.city || 'Город не указан'}</div>
            <div className="profile-card__meta">
              <span className="status-pill">{SKILL_LEVEL_LABELS[profile.skillLevel]}</span>
              <span className="profile-card__rating">Рейтинг: {profile.rating.toFixed(1)}</span>
            </div>
          </div>

          <button type="button" className="btn btn--primary btn--full" onClick={() => setIsEditing(true)}>
            Редактировать профиль
          </button>
        </>
      )}

      {isEditing && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onSave={updateProfile}
        />
      )}
    </div>
  )
}
