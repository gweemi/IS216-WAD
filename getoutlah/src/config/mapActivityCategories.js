import { INTERESTS } from '@/config/preferences'

// Map presentation deliberately derives from the onboarding taxonomy.
export const MAP_ACTIVITY_CATEGORIES = Object.fromEntries(
  INTERESTS.map(({ id, label, emoji, color, mapIcon }) => [id, { label, emoji, color, icon: mapIcon }]),
)

export const MAP_ACTIVITY_CATEGORY_FALLBACK = {
  label: 'Activity',
  emoji: '✨',
  color: '#9A8CA6',
  icon: 'compass',
}

export const MAP_ACTIVITY_CATEGORY_IDS = Object.keys(MAP_ACTIVITY_CATEGORIES)

export function getMapActivityCategory(category) {
  return MAP_ACTIVITY_CATEGORIES[category] ?? null
}
