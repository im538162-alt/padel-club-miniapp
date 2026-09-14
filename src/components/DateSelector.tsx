import { addDays, formatDateShort, toDateKey } from '../utils/date'

interface Props {
  today: Date
  selectedDateKey: string
  onSelect: (dateKey: string) => void
}

export function DateSelector({ today, selectedDateKey, onSelect }: Props) {
  const todayKey = toDateKey(today)
  const tomorrowKey = toDateKey(addDays(today, 1))
  const isCustom = selectedDateKey !== todayKey && selectedDateKey !== tomorrowKey

  return (
    <div className="date-selector">
      <button
        type="button"
        className={`date-chip ${selectedDateKey === todayKey ? 'is-active' : ''}`}
        onClick={() => onSelect(todayKey)}
      >
        Сегодня
      </button>
      <button
        type="button"
        className={`date-chip ${selectedDateKey === tomorrowKey ? 'is-active' : ''}`}
        onClick={() => onSelect(tomorrowKey)}
      >
        Завтра
      </button>
      <label className={`date-chip date-chip--calendar ${isCustom ? 'is-active' : ''}`}>
        <span>{isCustom ? formatDateShort(selectedDateKey) : '📅 Календарь'}</span>
        <input
          type="date"
          className="date-chip__input"
          min={todayKey}
          value={selectedDateKey}
          onChange={(event) => event.target.value && onSelect(event.target.value)}
        />
      </label>
    </div>
  )
}
