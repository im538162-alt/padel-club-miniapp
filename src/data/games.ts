import { addDays, toDateKey } from '../utils/date'
import type { Game } from '../types'

export function buildSeedGames(today: Date): Game[] {
  return [
    {
      id: 'seed-1',
      dateKey: toDateKey(addDays(today, 3)),
      time: '18:30',
      courtName: 'Корт 2',
      opponent: 'Дмитрий Соколов',
      isUpcoming: true,
    },
    {
      id: 'seed-2',
      dateKey: toDateKey(addDays(today, -2)),
      time: '11:00',
      courtName: 'Корт 1',
      opponent: 'Игра с друзьями',
      isUpcoming: false,
      result: 'win',
    },
    {
      id: 'seed-3',
      dateKey: toDateKey(addDays(today, -5)),
      time: '20:00',
      courtName: 'Корт 3',
      opponent: 'Анна Волкова',
      isUpcoming: false,
      result: 'loss',
    },
    {
      id: 'seed-4',
      dateKey: toDateKey(addDays(today, -9)),
      time: '09:30',
      courtName: 'Корт 4',
      opponent: 'Максим Орлов',
      isUpcoming: false,
      result: 'win',
    },
  ]
}
