const FALLBACK_NAME = 'Игорь'

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

export function getTelegramUser(): TelegramWebAppUser | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.user
}

export function resolveDisplayName(): string {
  const user = getTelegramUser()
  if (!user) return FALLBACK_NAME
  return user.first_name || user.username || FALLBACK_NAME
}
