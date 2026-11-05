
import { ACTIVITY_SOURCES } from './activitySource.js'
export const DEFAULT_ORGANISERS = [
  { id: '18480976563', name: 'MarketWise ASIA' },
  { id: '26202793543', name: 'Affordable Art Fair Singapore' },
  { id: '115820118091', name: 'Vamp Productions' },
  { id: '121730758969', name: 'Atomic Events Global' },
  { id: '110303953351', name: 'Toy Space' },
  { id: '34519717313', name: 'Singapore Clay Festival' },
  { id: '34325740917', name: 'Co.' },
  { id: '76635035233', name: 'Because - Sports to Support' },
  { id: '121856164707', name: 'Asian Board Game Festival' }
]

export const EXCLUDE = /conference|summit|forum|webinar|seminar|symposium|trimester|networking|b2b/i

const KEYWORDS = {
  volunteering: ['volunteer', 'charity', 'fundrais', 'clean-up', 'cleanup', 'clean up'],
  sports: ['fun run', 'marathon', 'fitness', 'sport', 'cycling', 'badminton', 'football', 'futsal', 'climb', 'swim', 'skate'],
  outdoors: ['hike', 'trail', 'park', 'garden', 'nature', 'beach', 'kayak', 'camp'],
  wellness: ['yoga', 'wellness', 'meditat', 'mindful', 'pilates'],
  workshops: ['workshop', 'class', 'clay', 'pottery', 'craft', 'diy'],
  food: ['food', 'wine', 'beer', 'coffee', 'dining', 'brunch', 'tasting', 'hawker', 'dessert'],
  events: ['concert', 'music', 'band', 'orchestra', 'gig', 'festival', 'market', 'pop-up', 'popup'],
  games: ['game', 'esports', 'toy', 'puzzle'],
  arts: ['art', 'museum', 'exhibit', 'gallery', 'theatre', 'theater', 'dance', 'film', 'heritage'],
}

export function guessCategory(title = '') {
  const text = title.toLowerCase()
  for (const category in KEYWORDS) {
    for (const word of KEYWORDS[category]) {
      if (text.includes(word)) return category
    }
  }
  return 'events'
}

const ENERGY = { sports: 'high', outdoors: 'medium', volunteering: 'medium' }
export const guessEnergy = (category) => ENERGY[category] || 'low'

export function regionOf(lat, lng) {
  if (lat == null || lng == null) return null
  if (lat > 1.4) return 'north'
  if (lng > 103.92) return 'east'
  if (lng < 103.75) return 'west'
  if (lat > 1.35 && lng > 103.86) return 'north-east'
  return 'central'
}

export function fromEventbrite(e) {
  const venue = e.venue || {}
  const address = venue.address || {}
  const logo = e.logo || {}
  const original = logo.original || {}
  const description = e.description || {}

  const start = Date.parse(utcTime(e.start)), end = Date.parse(utcTime(e.end))
  const lat = parseFloat(venue.latitude) || null, lng = parseFloat(venue.longitude) || null
  return {
    provider: 'eventbrite', contentType: 'event',
    title: eventName(e) || 'Event',
    cost: e.is_free ? 0 : null,
    durationHrs: start && end && end - start < 86400000 ? Math.round(((end - start) / 3600000) * 10) / 10 : null,
    area: venue.name || address.city || '',
    lat, lng, startsAt: start || null, endsAt: end || null, url: e.url || null,
    imageUrl: logo.url || null,
    imageLargeUrl: original.url || null,
    description: htmlToText(e.fullDescription || description.html) || (e.summary ? e.summary.trim() : '') || null,
    seriesId: e.series_id || null,
    organiserId: e.organizer_id || null,
  }
}

export const isEventbriteListing = (activity, id = '') =>
  activity?.provider === 'eventbrite'
  || (activity?.provider == null && String(id).startsWith('eb-'))

export const desc_max = 5000
export function htmlToText(html) {
  if (!html) return ''
  let text = html
  for (const tag of ['<br>', '<br/>', '<br />', '</p>', '</div>', '</li>', '</h1>', '</h2>', '</h3>']) {
    text = text.replaceAll(tag, '\n')
  }
  text = text.replaceAll('<li>', '• ')
  text = text.replace(/<[^>]*>/g, '')
  text = text.replaceAll('&nbsp;', ' ').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line !== '')
  text = lines.join('\n')
  if (text.length > desc_max) text = text.slice(0, desc_max - 1) + '…'
  return text
}

export function defaultsFor(title, lat, lng) {
  const category = guessCategory(title)
  return {
    category, type: 'events', setting: null, energyLevel: guessEnergy(category), groupFriendly: true,
    region: regionOf(lat, lng), source: ACTIVITY_SOURCES.EXTERNAL, needsReview: true,
  }
}

export async function fetchOrganiserEvents(token, organiser) {
  const out = []
  let continuation = ''
  for (let page = 0; page < 10; page++) {
    const url = `https://www.eventbriteapi.com/v3/organizers/${organiser}/events/?status=live&expand=venue${continuation ? `&continuation=${continuation}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`organiser ${organiser}: Eventbrite said ${res.status}${err.error_description ? ` (${err.error_description})` : ''}`)
    }
    const body = await res.json()
    out.push(...(body.events || []))
    if (!body.pagination || !body.pagination.has_more_items) break
    continuation = body.pagination.continuation
  }
  return out
}

export async function fetchDescriptions(token, events) {
  const seen = {}
  for (const e of events) {
    const key = e.series_id || e.id
    if (!(key in seen)) {
      seen[key] = null
      try {
        const res = await fetch(`https://www.eventbriteapi.com/v3/events/${e.id}/description/`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) seen[key] = (await res.json()).description || null
      } catch {}
    }
    if (seen[key]) e.fullDescription = seen[key]
  }
}

const wanted = (e, now) => {
  const end = Date.parse(utcTime(e.end) || utcTime(e.start))
  return !EXCLUDE.test(eventName(e) || '') && !(end < now)
}

function utcTime(time) {
  if (!time) return undefined
  return time.utc
}

function eventName(e) {
  if (!e.name) return undefined
  return e.name.text
}

export async function fetchEvents(token, organiserIds) {
  const byId = new Map(), failures = [], failedOrganisers = []
  for (const organiser of organiserIds) {
    try { (await fetchOrganiserEvents(token, organiser)).forEach((e) => byId.set(e.id, e)) }
    catch (e) { failures.push(e.message); failedOrganisers.push(organiser) }
  }
  if (!byId.size && failures.length) throw new Error(failures.join('; '))
  const events = [...byId.values()]
  await fetchDescriptions(token, events.filter((e) => wanted(e, Date.now())))
  return { events, failures, failedOrganisers }
}

export function planActivityWrites(events, existing, now = Date.now(), failedOrganisers = []) {
  const plan = { writes: [], deletes: [], added: 0, updated: 0, skipped: 0, removed: 0 }
  const live = new Set()
  for (const e of events) {
    const base = fromEventbrite(e)
    if (!wanted(e, now)) { plan.skipped++; continue }
    const id = `eb-${e.id}`
    live.add(id)
    if (existing.has(id)) { plan.writes.push({ id, data: base, merge: true }); plan.updated++ }
    else { plan.writes.push({ id, data: { ...base, ...defaultsFor(base.title, base.lat, base.lng) }, merge: false }); plan.added++ }
  }
  for (const [id, a] of existing) {
    if (!isEventbriteListing(a, id) || live.has(id)) continue
    const end = a.endsAt || a.startsAt
    const ended = end != null && end < now
    const unlisted = !failedOrganisers.includes(a.organiserId)
    if (ended || unlisted) { plan.deletes.push(id); plan.removed++ }
  }
  return plan
}
