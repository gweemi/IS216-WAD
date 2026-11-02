// The options shown in the new-user questionnaire.
//
// The `id`s are what gets saved in Firestore (users/{uid}.preferences), so the
// recommendation code should use these SAME ids, e.g. an activity's `category`
// should be one of the INTEREST ids below. Labels and emojis can change freely;
// ids should not (old answers would stop matching).
// See PREFERENCES.md for the full data format.

export const INTERESTS = [
  { id: 'outdoors', label: 'Outdoors & nature', emoji: '🌳', hint: 'Hikes, parks, beaches', color: '#B8EC61', mapIcon: 'bi-tree' },
  { id: 'sports', label: 'Sports & fitness', emoji: '🏃', hint: 'Bouldering, runs, team sports', color: '#78DDE9', mapIcon: 'bi-dumbbell' },
  { id: 'arts', label: 'Arts & culture', emoji: '🎨', hint: 'Museums, exhibitions', color: '#FFB8D1', mapIcon: 'bi-palette' },
  { id: 'food', label: 'Food & cafés', emoji: '🍜', hint: 'Hawker trails, café hopping', color: '#FF947B', mapIcon: 'bi-fork-knife' },
  { id: 'workshops', label: 'Workshops & crafts', emoji: '🏺', hint: 'Pottery, cooking, art', color: '#FFC976', mapIcon: 'bi-paintbrush' },
  { id: 'events', label: 'Events', emoji: '🎟️', hint: 'Concerts, festivals, markets, pop-ups', color: '#BD9BFF', mapIcon: 'bi-calendar-event' },
  { id: 'games', label: 'Games & chill', emoji: '🎲', hint: 'Board games, escape rooms', color: '#FFE075', mapIcon: 'bi-controller' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘', hint: 'Yoga, meditation', color: '#6DE4F2', mapIcon: 'bi-heart-pulse' },
  { id: 'volunteering', label: 'Volunteering', emoji: '🤝', hint: 'Community events', color: '#8EACFF', mapIcon: 'bi-heart' },
]

export const PREFERENCES_VERSION = 2

// maxBudget is the most (in SGD) someone wants to spend on one activity.
// null means "no limit".
export const BUDGETS = [
  { id: 'free', label: 'Free only', maxBudget: 0 },
  { id: 'under10', label: 'Up to $10', maxBudget: 10 },
  { id: 'under20', label: 'Up to $20', maxBudget: 20 },
  { id: 'under50', label: 'Up to $50', maxBudget: 50 },
  { id: 'any', label: "Price doesn't matter", maxBudget: null },
]

export const ENERGY_LEVELS = [
  { id: 'low', label: 'Chill', emoji: '😌', hint: 'Easy-going, low effort' },
  { id: 'medium', label: 'Balanced', emoji: '🙂', hint: 'A bit of both' },
  { id: 'high', label: 'Active', emoji: '⚡', hint: 'Get moving, break a sweat' },
]

export const GROUP_PREFERENCES = [
  { id: 'solo', label: 'Solo', emoji: '🧍', hint: 'Me time' },
  { id: 'group', label: 'With friends', emoji: '👯', hint: 'The more the merrier' },
  { id: 'either', label: 'Balanced', emoji: '🤷', hint: 'Depends on the day' },
]

export const MIN_INTERESTS = 1
export const MAX_INTERESTS = INTERESTS.length

/** Turn an interest id back into its label, e.g. 'food' → 'Food & cafés'. */
export function interestLabel(id) {
  return INTERESTS.find((i) => i.id === id)?.label ?? id
}

export function getInterest(id) {
  return INTERESTS.find((interest) => interest.id === id) ?? null
}
