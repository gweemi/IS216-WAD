// Colour + emoji for each category, matching the app's colour tokens (gol-theme.css).
import { getInterest } from '@/config/preferences'

export const categoryColor = (id) => getInterest(id)?.color ?? '#ece6fb'
export const categoryEmoji = (id) => getInterest(id)?.emoji ?? '✨'
export const categoryLabel = (id) => getInterest(id)?.label ?? id
// Purple tile needs white text; the light ones need dark text.
export const tileTextColor = (id) => (id === 'workshops' ? '#fff' : '#221a3b')
export const priceText = (a) => (a.cost === 0 ? 'Free' : a.cost == null ? 'Price varies' : '$' + a.cost)
export const sourceLabel = (source) => (source === 'eventbrite' ? 'Eventbrite' : 'Curated')

// Where to sign up: the Eventbrite event page, or the curated activity's own website.
// Only http(s) links, since curated links are typed in by hand. Null when there's nowhere to go.
export function bookingLink(a) {
  let url
  try { url = new URL(a?.url) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const label = a.source === 'eventbrite' ? (a.cost === 0 ? 'Register on Eventbrite' : 'Get tickets on Eventbrite') : 'Book or find out more'
  return { href: url.href, label }
}
// "Sat 1 Nov, 7:30 pm"
export const whenText = (ms) =>
  new Date(ms).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
