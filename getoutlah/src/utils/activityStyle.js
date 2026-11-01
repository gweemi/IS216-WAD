// Colour + emoji for each category, matching the app's colour tokens (gol-theme.css).
import { getInterest } from '@/config/preferences'

export const categoryColor = (id) => getInterest(id)?.color ?? '#ece6fb'
export const categoryEmoji = (id) => getInterest(id)?.emoji ?? '✨'
export const categoryLabel = (id) => getInterest(id)?.label ?? id
// Purple tile needs white text; the light ones need dark text.
export const tileTextColor = (id) => (id === 'workshops' ? '#fff' : '#221a3b')
export const priceText = (a) => (a.cost === 0 ? 'Free' : a.cost == null ? 'Price varies' : '$' + a.cost)



// Eventbrite events only run on set dates, so users see them as "Limited".
const SOURCE_LABELS = { eventbrite: 'Limited', openjio: 'OpenJio', curated: 'Curated' }
export const sourceLabel = (source) => SOURCE_LABELS[source] ?? 'Curated'

// Events running 24 hrs or more: we only know the first start and last end, not the daily hours.
export const isVaried = (a) => a.endsAt - a.startsAt >= 86400000
export const durationText = (a) => (isVaried(a) ? 'Varied duration' : `${a.durationHrs ?? '?'} hr`)
export const fitsHours = (a, max) =>
  max === 'varied' ? isVaried(a) : !isVaried(a) && (a.durationHrs == null || a.durationHrs <= max)

export function bookingLink(a) {
  let url
  try { url = new URL(a?.url) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const label = a.source === 'eventbrite' ? (a.cost === 0 ? 'Register on Eventbrite' : 'Get tickets on Eventbrite') : 'Book or find out more'
  return { href: url.href, label }
}

export const whenText = (ms) =>
  new Date(ms).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })