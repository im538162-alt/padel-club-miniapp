import { useState } from 'react'
import { SKILL_LEVEL_OPTIONS } from '../data/skillLevels'
import { StateNotice } from './StateNotice'
import type { PlayerProfile, SkillLevel } from '../types'

interface Props {
  profile: PlayerProfile
  onClose: () => void
  onSave: (input: { displayName: string; city: string; skillLevel: SkillLevel }) => Promise<void>
}

export function EditProfileModal({ profile, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [city, setCity] = useState(profile.city ?? '')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skillLevel)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = displayName.trim()

  const handleSave = async () => {
    if (!trimmedName || isSaving) return
    setError(null)
    setIsSaving(true)
    try {
      await onSave({ displayName: trimmedName, city: city.trim(), skillLevel })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />
        <h2 className="modal-sheet__title">Редактировать профиль</h2>

        <label className="form-field">
          <span className="form-field__label">Имя</span>
          <input
            className="text-input"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={60}
            disabled={isSaving}
          />
        </label>

        <label className="form-field">
          <span className="form-field__label">Город</span>
          <input
            className="text-input"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Не указан"
            maxLength={60}
            disabled={isSaving}
          />
        </label>

        <div className="form-field">
          <span className="form-field__label">Уровень игры</span>
          <div className="level-picker">
            {SKILL_LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`level-option ${skillLevel === option.value ? 'is-active' : ''}`}
                onClick={() => setSkillLevel(option.value)}
                disabled={isSaving}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <StateNotice kind="error" title="Не удалось сохранить" description={error} />}

        <div className="modal-sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={isSaving || !trimmedName}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
