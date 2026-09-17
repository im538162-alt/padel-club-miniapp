import { useRef, useState, type ChangeEvent } from 'react'
import { EditProfileModal } from '../components/EditProfileModal'
import { StateNotice } from '../components/StateNotice'
import { SKILL_LEVEL_LABELS } from '../data/skillLevels'
import { signOutEmailSession } from '../lib/auth'
import { useAppContext } from '../state/context'
import { getTelegramInitData } from '../utils/telegram'

interface Props {
  onOpenAdmin: () => void
}

export function ProfileScreen({ onOpenAdmin }: Props) {
  const { profile, profileLoading, profileError, reloadProfile, updateProfile, uploadAvatar, isAdmin } =
    useAppContext()
  const isTelegram = Boolean(getTelegramInitData())
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleSignOut = async () => {
    setSignOutError(null)
    setIsSigningOut(true)
    try {
      await signOutEmailSession()
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Не удалось выйти')
      setIsSigningOut(false)
    }
  }

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setAvatarError(null)
    setIsUploadingAvatar(true)
    try {
      await uploadAvatar(file)
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Не удалось загрузить фото')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

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
            {profile.avatarUrl ? (
              <img
                className="profile-card__avatar profile-card__avatar--photo"
                src={profile.avatarUrl}
                alt=""
              />
            ) : (
              <div className="profile-card__avatar">
                {(profile.displayName.charAt(0) || '?').toUpperCase()}
              </div>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={handleAvatarButtonClick}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Загружаем…' : profile.avatarUrl ? 'Изменить фото' : 'Добавить фото'}
            </button>

            {avatarError && (
              <StateNotice kind="error" title="Не удалось загрузить фото" description={avatarError} />
            )}

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

          {isAdmin && (
            <button type="button" className="btn btn--ghost btn--full" onClick={onOpenAdmin}>
              Админ-панель
            </button>
          )}

          {!isTelegram && (
            <>
              {signOutError && (
                <StateNotice kind="error" title="Не удалось выйти" description={signOutError} />
              )}
              <button
                type="button"
                className="btn btn--ghost btn--full"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Выходим…' : 'Выйти'}
              </button>
            </>
          )}
        </>
      )}

      {isEditing && profile && (
        <EditProfileModal profile={profile} onClose={() => setIsEditing(false)} onSave={updateProfile} />
      )}
    </div>
  )
}
