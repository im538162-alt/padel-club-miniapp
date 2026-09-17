import { useState } from 'react'
import { StateNotice } from './StateNotice'

interface Props {
  onClose: () => void
  onCreate: (capacity: 2 | 4) => Promise<void>
}

const CAPACITY_OPTIONS: { value: 2 | 4; label: string }[] = [
  { value: 2, label: '2 игрока' },
  { value: 4, label: '4 игрока' },
]

export function CreateOpenMatchModal({ onClose, onCreate }: Props) {
  const [capacity, setCapacity] = useState<2 | 4>(4)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      await onCreate(capacity)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть игру')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />
        <h2 className="modal-sheet__title">Открыть игру для других игроков</h2>
        <p className="modal-sheet__label">Сколько игроков должно быть в игре?</p>

        <div className="level-picker">
          {CAPACITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`level-option ${capacity === option.value ? 'is-active' : ''}`}
              onClick={() => setCapacity(option.value)}
              disabled={isSubmitting}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && <StateNotice kind="error" title="Не удалось открыть игру" description={error} />}

        <div className="modal-sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Создаём…' : 'Открыть игру'}
          </button>
        </div>
      </div>
    </div>
  )
}
