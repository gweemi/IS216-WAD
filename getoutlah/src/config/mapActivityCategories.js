import { INTERESTS } from '@/config/preferences'

// Map presentation deliberately derives from the onboarding taxonomy.
export const MAP_ACTIVITY_CATEGORIES = Object.fromEntries(
  INTERESTS.map(({ id, label, color, mapIcon }) => [id, { label, color, icon: mapIcon }]),
)

export const MAP_ACTIVITY_CATEGORY_FALLBACK = {
  label: 'Activity',
  color: '#9A8CA6',
  icon: 'bi-compass',
}

export const MAP_ACTIVITY_CATEGORY_IDS = Object.keys(MAP_ACTIVITY_CATEGORIES)

export function getMapActivityCategory(category) {
  return MAP_ACTIVITY_CATEGORIES[category] ?? null
}
