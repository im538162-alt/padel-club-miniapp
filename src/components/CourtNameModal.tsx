import { useState } from 'react'
import { StateNotice } from './StateNotice'

interface Props {
  title: string
  initialName?: string
  confirmLabel: string
  confirmingLabel: string
  onSubmit: (name: string) => Promise<void>
  onClose: () => void
}

export function CourtNameModal({
  title,
  initialName = '',
  confirmLabel,
  confirmingLabel,
  onSubmit,
  onClose,
}: Props) {
  const [name, setName] = useState(initialName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = name.trim()

  const handleSubmit = async () => {
    if (!trimmedName || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(trimmedName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить корт')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />
        <h2 className="modal-sheet__title">{title}</h2>

        <label className="form-field">
          <span className="form-field__label">Название корта</span>
          <input
            className="text-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            disabled={isSubmitting}
            autoFocus
          />
        </label>

        {error && <StateNotice kind="error" title="Не удалось сохранить" description={error} />}

        <div className="modal-sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !trimmedName}
          >
            {isSubmitting ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
