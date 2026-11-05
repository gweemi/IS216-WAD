
export const INTERESTS = [
  { id: 'outdoors', label: 'Outdoors & nature', emoji: '🌳', hint: 'Hikes, parks, beaches', color: '#B8EC61', mapIcon: 'tree' },
  { id: 'sports', label: 'Sports & fitness', emoji: '🏃', hint: 'Bouldering, runs, team sports', color: '#78DDE9', mapIcon: 'barbell' },
  { id: 'arts', label: 'Arts & culture', emoji: '🎨', hint: 'Museums, exhibitions', color: '#FFB8D1', mapIcon: 'palette' },
  { id: 'food', label: 'Food & cafés', emoji: '🍜', hint: 'Hawker trails, café hopping', color: '#FF947B', mapIcon: 'fork-knife' },
  { id: 'workshops', label: 'Workshops & crafts', emoji: '🏺', hint: 'Pottery, cooking, art', color: '#FFC976', mapIcon: 'paint-brush' },
  { id: 'events', label: 'Events', emoji: '🎟️', hint: 'Concerts, festivals, markets, pop-ups', color: '#BD9BFF', mapIcon: 'calendar-dots' },
  { id: 'games', label: 'Games & chill', emoji: '🎲', hint: 'Board games, escape rooms', color: '#FFE075', mapIcon: 'game-controller' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘', hint: 'Yoga, meditation', color: '#4FAE84', mapIcon: 'heartbeat' },
  { id: 'volunteering', label: 'Volunteering', emoji: '🤝', hint: 'Community events', color: '#8EACFF', mapIcon: 'hand-heart' },
]

export const PREFERENCES_VERSION = 2

export const BUDGETS = [
  { id: 'free', label: 'Free only', maxBudget: 0 },
  { id: 'under10', label: 'Up to $10', maxBudget: 10 },
  { id: 'under20', label: 'Up to $20', maxBudget: 20 },
  { id: 'under50', label: 'Up to $50', maxBudget: 50 },
  { id: 'any', label: "Price doesn't matter", maxBudget: null },
]

export const ENERGY_LEVELS = [
  { id: 'low', label: 'Chill', emoji: '😌', hint: 'Easy-going, low effort' },
  { id: 'high', label: 'Active', emoji: '⚡', hint: 'Get moving, break a sweat' },
  { id: 'medium', label: 'Balanced', emoji: '🙂', hint: 'A bit of both' },
]

export const GROUP_PREFERENCES = [
  { id: 'solo', label: 'Solo', emoji: '🧍', hint: 'Me time' },
  { id: 'group', label: 'With friends', emoji: '👯', hint: 'The more the merrier' },
  { id: 'either', label: 'Balanced', emoji: '🤷', hint: 'Depends on the day' },
]

export const MIN_INTERESTS = 1
export const MAX_INTERESTS = INTERESTS.length

export function getInterest(id) {
  return INTERESTS.find((interest) => interest.id === id) ?? null
}
