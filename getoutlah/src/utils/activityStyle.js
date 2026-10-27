// Colour + emoji for each category, matching the app's colour tokens (gol-theme.css).
import { getInterest } from '@/config/preferences'

export const categoryColor = (id) => getInterest(id)?.color ?? '#ece6fb'
export const categoryEmoji = (id) => getInterest(id)?.emoji ?? '✨'
export const categoryLabel = (id) => getInterest(id)?.label ?? id
// Purple tile needs white text; the light ones need dark text.
export const tileTextColor = (id) => (id === 'workshops' ? '#fff' : '#221a3b')
export const priceText = (a) => (a.cost === 0 ? 'Free' : a.cost == null ? 'Price varies' : '$' + a.cost)
export const sourceLabel = (source) => (source === 'eventbrite' ? 'Eventbrite' : 'Curated')
