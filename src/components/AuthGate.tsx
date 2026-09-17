import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getTelegramInitData } from '../utils/telegram'
import { EmailAuthScreen } from '../screens/EmailAuthScreen'
import { StateNotice } from './StateNotice'

interface Props {
  children: ReactNode
}

// В Telegram (есть initData) — текущий сценарий без изменений, Supabase Auth
// вообще не задействуется. Вне Telegram (обычный браузер/PWA) без активной
// сессии показываем экран входа по email вместо приложения.
export function AuthGate({ children }: Props) {
  const isTelegram = Boolean(getTelegramInitData())
  const [session, setSession] = useState<Session | null>(null)
  const [checkedSession, setCheckedSession] = useState(false)

  useEffect(() => {
    if (isTelegram || !supabase) {
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setCheckedSession(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      setCheckedSession(true)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isTelegram])

  if (isTelegram) {
    return <>{children}</>
  }

  if (!checkedSession) {
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

  if (!session) {
    return (
      <div className="app-shell">
        <main className="app-content">
          <EmailAuthScreen />
        </main>
      </div>
    )
  }

  return <>{children}</>
}
