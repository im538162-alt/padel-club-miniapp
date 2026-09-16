import type { SkillLevel } from '../types'

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Начинающий',
  intermediate: 'Любитель',
  advanced: 'Продвинутый',
}

export const SKILL_LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: SKILL_LEVEL_LABELS.beginner },
  { value: 'intermediate', label: SKILL_LEVEL_LABELS.intermediate },
  { value: 'advanced', label: SKILL_LEVEL_LABELS.advanced },
]
