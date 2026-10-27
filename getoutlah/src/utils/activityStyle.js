// Colour + emoji for each category, matching the app's colour tokens (gol-theme.css).
import { INTERESTS } from '@/config/preferences'

const COLORS = {
  outdoors: '#b9f04c', sports: '#ff8670', arts: '#ffd44d', food: '#ffd44d', workshops: '#6b42e3',
  music: '#6de4f2', games: '#ffd44d', wellness: '#b9f04c', volunteering: '#6de4f2',
}
export const categoryColor = (id) => COLORS[id] ?? '#ece6fb'
export const categoryEmoji = (id) => INTERESTS.find((i) => i.id === id)?.emoji ?? '✨'
export const categoryLabel = (id) => INTERESTS.find((i) => i.id === id)?.label ?? id
// Purple tile needs white text; the light ones need dark text.
export const tileTextColor = (id) => (id === 'workshops' ? '#fff' : '#221a3b')
export const priceText = (a) => (a.cost === 0 ? 'Free' : a.cost == null ? 'Price varies' : '$' + a.cost)
