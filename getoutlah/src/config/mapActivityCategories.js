export const MAP_ACTIVITY_CATEGORIES = {
  music: { label: 'Music & Shows', color: '#BD9BFF', icon: 'bi-music-note-beamed' },
  arts: { label: 'Arts & Culture', color: '#FFB8D1', icon: 'bi-palette' },
  workshops: { label: 'Workshops & Learning', color: '#FFC976', icon: 'bi-paintbrush' },
  nature: { label: 'Nature & Outdoors', color: '#B8EC61', icon: 'bi-tree' },
  sports: { label: 'Sports & Fitness', color: '#78DDE9', icon: 'bi-dumbbell' },
  food: { label: 'Food & Drink', color: '#FF947B', icon: 'bi-fork-knife' },
  festivals: { label: 'Festivals & Markets', color: '#FFE075', icon: 'bi-shop' },
  community: { label: 'Community & Volunteering', color: '#8EACFF', icon: 'bi-heart' },
}

export const MAP_ACTIVITY_CATEGORY_FALLBACK = {
  label: 'Activity',
  color: '#9A8CA6',
  icon: 'bi-compass',
}

export const MAP_ACTIVITY_CATEGORY_IDS = Object.keys(MAP_ACTIVITY_CATEGORIES)

export function getMapActivityCategory(category) {
  return MAP_ACTIVITY_CATEGORIES[category] ?? null
}
