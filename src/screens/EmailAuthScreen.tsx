import { useState, type FormEvent } from 'react'
import { StateNotice } from '../components/StateNotice'
import { requestEmailLoginLink } from '../lib/auth'

export function EmailAuthScreen() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSent, setIsSent] = useState(false)

  const trimmedEmail = email.trim()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmedEmail || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      await requestEmailLoginLink(trimmedEmail)
      setIsSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить ссылку для входа')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="home-screen__greeting">
        <h1>Вход в Padel Club</h1>
        <p>Укажите email — пришлём ссылку для входа</p>
      </div>

      {isSent ? (
        <StateNotice kind="loading" title="Проверьте почту и откройте ссылку для входа" />
      ) : (
        <form className="form-field" onSubmit={handleSubmit}>
          <span className="form-field__label">Email</span>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          {error && (
            <StateNotice kind="error" title="Не удалось отправить ссылку" description={error} />
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={isSubmitting || !trimmedEmail}
          >
            {isSubmitting ? 'Отправляем…' : 'Получить ссылку для входа'}
          </button>
        </form>
      )}
    </div>
  )
}
