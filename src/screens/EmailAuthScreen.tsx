import { useState, type FormEvent } from 'react'
import { StateNotice } from '../components/StateNotice'
import { requestEmailOtp, verifyEmailOtp } from '../lib/auth'

type Step = 'email' | 'code'

export function EmailAuthScreen() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [justResent, setJustResent] = useState(false)

  const trimmedEmail = email.trim()

  const sendCode = async () => {
    if (!trimmedEmail || isSendingCode) return

    setSendError(null)
    setJustResent(false)
    setIsSendingCode(true)
    try {
      await requestEmailOtp(trimmedEmail)
      setStep('code')
      setCode('')
      setVerifyError(null)
      setJustResent(step === 'code')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Не удалось отправить код')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendCode()
  }

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!code || isVerifying) return

    setVerifyError(null)
    setIsVerifying(true)
    try {
      await verifyEmailOtp(trimmedEmail, code)
      // При успехе AuthGate сам увидит новую сессию через onAuthStateChange
      // и откроет приложение — этот экран просто размонтируется.
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Неверный код. Попробуйте ещё раз.')
      setIsVerifying(false)
    }
  }

  const handleChangeEmail = () => {
    setStep('email')
    setCode('')
    setVerifyError(null)
    setSendError(null)
    setJustResent(false)
  }

  return (
    <div className="screen">
      <div className="home-screen__greeting">
        <h1>Вход в Padel Club</h1>
        <p>
          {step === 'email'
            ? 'Укажите email — пришлём код для входа'
            : `Мы отправили код на ${trimmedEmail}`}
        </p>
      </div>

      {step === 'email' && (
        <form className="form-field" onSubmit={handleEmailSubmit}>
          <span className="form-field__label">Email</span>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={isSendingCode}
          />

          {sendError && (
            <StateNotice kind="error" title="Не удалось отправить код" description={sendError} />
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={isSendingCode || !trimmedEmail}
          >
            {isSendingCode ? 'Отправляем…' : 'Получить код для входа'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <>
          <form className="form-field" onSubmit={handleCodeSubmit}>
            <span className="form-field__label">Код из письма (8 цифр)</span>
            <input
              className="text-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              placeholder="00000000"
              autoComplete="one-time-code"
              required
              disabled={isVerifying}
            />

            {verifyError && (
              <StateNotice kind="error" title="Неверный код" description={verifyError} />
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isVerifying || !code}
            >
              {isVerifying ? 'Проверяем…' : 'Подтвердить код'}
            </button>
          </form>

          {sendError && (
            <StateNotice kind="error" title="Не удалось отправить код" description={sendError} />
          )}

          {justResent && !sendError && (
            <StateNotice kind="loading" title="Код отправлен повторно" />
          )}

          <button
            type="button"
            className="btn btn--ghost btn--full"
            onClick={() => void sendCode()}
            disabled={isSendingCode}
          >
            {isSendingCode ? 'Отправляем…' : 'Отправить код ещё раз'}
          </button>

          <button type="button" className="btn btn--ghost btn--small" onClick={handleChangeEmail}>
            Изменить email
          </button>
        </>
      )}
    </div>
  )
}
