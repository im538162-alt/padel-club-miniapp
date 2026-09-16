import { StateNotice } from './StateNotice'

interface Props {
  title: string
  message: string
  confirmLabel: string
  confirmingLabel: string
  cancelLabel?: string
  isConfirming?: boolean
  error?: string | null
  onConfirm: () => void
  onDismiss: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmingLabel,
  cancelLabel = 'Не отменять',
  isConfirming = false,
  error,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />
        <h2 className="modal-sheet__title">{title}</h2>
        <p className="modal-sheet__subtitle">{message}</p>

        {error && (
          <StateNotice kind="error" title="Не удалось выполнить действие" description={error} />
        )}

        <div className="modal-sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onDismiss} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
