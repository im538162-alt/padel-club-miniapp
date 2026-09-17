import { useEffect, useState } from 'react'
import { StateNotice } from '../components/StateNotice'
import { useAppContext } from '../state/context'
import { formatDateWithWeekday } from '../utils/date'
import type { OpenMatch } from '../types'

const POLL_INTERVAL_MS = 10000
const MAX_MESSAGE_LENGTH = 500

interface Props {
  match: OpenMatch
  onBack: () => void
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function MatchChatScreen({ match, onBack }: Props) {
  const {
    matchMessages,
    matchMessagesLoading,
    matchMessagesError,
    reloadMatchMessages,
    sendMatchMessage,
  } = useAppContext()
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    void reloadMatchMessages(match.id)
    const interval = setInterval(() => {
      void reloadMatchMessages(match.id)
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- следим только за matchId этого экрана
  }, [match.id])

  const trimmedMessage = messageText.trim()

  const handleSend = async () => {
    if (!trimmedMessage || isSending) return

    setSendError(null)
    setIsSending(true)
    try {
      await sendMatchMessage(match.id, trimmedMessage)
      setMessageText('')
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Не удалось отправить сообщение')
    } finally {
      setIsSending(false)
    }
  }

  const isInitialLoad = matchMessagesLoading && matchMessages.length === 0

  return (
    <div className="screen">
      <div className="screen__header">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Назад
        </button>
        <h1 className="screen__title">Чат игры</h1>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => void reloadMatchMessages(match.id)}
          disabled={matchMessagesLoading}
        >
          {matchMessagesLoading ? 'Обновляем…' : 'Обновить'}
        </button>
      </div>

      <p className="modal-sheet__subtitle">
        {match.courtName} · {formatDateWithWeekday(match.dateKey)} · {match.startTime}–{match.endTime}
      </p>

      {isInitialLoad && <StateNotice kind="loading" title="Загружаем сообщения…" />}

      {matchMessagesError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить сообщения"
          description={matchMessagesError}
          onRetry={() => void reloadMatchMessages(match.id)}
        />
      )}

      {!isInitialLoad && !matchMessagesError && matchMessages.length === 0 && (
        <p className="empty-state">Сообщений пока нет. Поздоровайтесь с участниками!</p>
      )}

      {!isInitialLoad && matchMessages.length > 0 && (
        <div className="game-list">
          {matchMessages.map((message) => (
            <div key={message.id} className="chat-message">
              {message.sender.avatarUrl ? (
                <img
                  className="rating-row__avatar rating-row__avatar--photo"
                  src={message.sender.avatarUrl}
                  alt=""
                />
              ) : (
                <div className="rating-row__avatar">
                  {(message.sender.displayName.charAt(0) || '?').toUpperCase()}
                </div>
              )}
              <div className="chat-message__body">
                <div className="chat-message__meta">
                  <span className="chat-message__name">{message.sender.displayName}</span>
                  <span className="chat-message__time">{formatMessageTime(message.createdAt)}</span>
                </div>
                <div className="chat-message__text">{message.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="form-field">
        <span className="form-field__label">Сообщение</span>
        <textarea
          className="text-input"
          rows={2}
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Напишите участникам игры…"
          disabled={isSending}
        />
      </label>

      {sendError && (
        <StateNotice kind="error" title="Не удалось отправить сообщение" description={sendError} />
      )}

      <button
        type="button"
        className="btn btn--primary btn--full"
        onClick={() => void handleSend()}
        disabled={isSending || !trimmedMessage}
      >
        {isSending ? 'Отправляем…' : 'Отправить'}
      </button>
    </div>
  )
}
