interface Props {
  kind: 'loading' | 'error'
  title: string
  description?: string
  onRetry?: () => void
}

export function StateNotice({ kind, title, description, onRetry }: Props) {
  return (
    <div className={`state-notice state-notice--${kind}`}>
      <div className="state-notice__icon">{kind === 'loading' ? '⏳' : '⚠️'}</div>
      <div className="state-notice__text">
        <div className="state-notice__title">{title}</div>
        {description && <div className="state-notice__description">{description}</div>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}
