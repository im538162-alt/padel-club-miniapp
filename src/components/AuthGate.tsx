import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getTelegramInitData } from '../utils/telegram'
import { StateNotice } from './StateNotice'

interface Props {
  children: ReactNode
}

// В Telegram (есть initData) — текущий сценарий без изменений, Supabase Auth
// вообще не задействуется. Вне Telegram (обычный браузер/PWA) без активной
// сессии автоматически создаём анонимную Supabase-сессию — экрана входа нет.
// При повторных открытиях того же PWA getSession() сразу вернёт уже
// сохранённую анонимную сессию, и signInAnonymously() не вызывается снова.
export function AuthGate({ children }: Props) {
  const isTelegram = Boolean(getTelegramInitData())
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (isTelegram) return

    let cancelled = false

    if (!supabase) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setError(
          'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local',
        )
        setIsReady(true)
      })
      return () => {
        cancelled = true
      }
    }

    const client = supabase

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
    })

    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        if (data.session) {
          setSession(data.session)
          return
        }

        const { data: signInData, error: signInError } = await client.auth.signInAnonymously()
        if (cancelled) return
        if (signInError) {
          setError(signInError.message)
          return
        }
        setSession(signInData.session)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Не удалось создать сессию')
      })
      .finally(() => {
        if (cancelled) return
        setIsReady(true)
      })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isTelegram, retryToken])

  if (isTelegram) {
    return <>{children}</>
  }

  if (error) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="screen">
            <StateNotice
              kind="error"
              title="Не удалось войти"
              description={error}
              onRetry={() => {
                setError(null)
                setIsReady(false)
                setRetryToken((n) => n + 1)
              }}
            />
          </div>
        </main>
      </div>
    )
  }

  if (!isReady || !session) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <div className="screen">
            <StateNotice kind="loading" title="Проверяем сессию…" />
          </div>
        </main>
      </div>
    )
  }

  return <>{children}</>
}
