import type { TabId } from '../types'

interface TabConfig {
  id: TabId
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'home', label: 'Главная', icon: '🏠' },
  { id: 'games', label: 'Мои игры', icon: '🎾' },
  { id: 'rating', label: 'Рейтинг', icon: '🏆' },
  { id: 'profile', label: 'Профиль', icon: '👤' },
]

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${active === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
