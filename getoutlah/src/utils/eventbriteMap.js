// Turns raw Eventbrite events into OUR activities. No Firebase and no browser-only code, so both the
// admin page (src/services/api/eventbriteSync.js) and the scheduled GitHub Action (scripts/sync-eventbrite.mjs) use it.

// Starting list of organisers to sync. Admins change the real list on /admin/activities
// (saved in Firestore config/eventbrite); this is only used until they do.
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

// Titles matching this are skipped (business events aren't what students look for). Edit freely.
export const EXCLUDE = /conference|summit|forum|webinar|seminar|symposium|trimester|networking|b2b/i

// First match wins, top to bottom. Keys are the onboarding interest ids.
// A keyword matches anywhere in the title, even inside a longer word ('sport' matches "Sports Day"),
// so avoid very short keywords like 'run' or 'spa' that hide inside other words ("brunch", "space").
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
  return 'events'   // nothing matched
}

const ENERGY = { sports: 'high', outdoors: 'medium', volunteering: 'medium' }
export const guessEnergy = (category) => ENERGY[category] ?? 'low'

// Rough Singapore regions from coordinates. Keep this in step with whatever rule the OpenJio code uses.
export function regionOf(lat, lng) {
  if (lat == null || lng == null) return null
  if (lat > 1.4) return 'north'
  if (lng > 103.92) return 'east'
  if (lng < 103.75) return 'west'
  if (lat > 1.35 && lng > 103.86) return 'north-east'
  return 'central'
}

// Fields that Eventbrite owns: refreshed on every sync.
export function fromEventbrite(e) {
  const start = Date.parse(e.start?.utc), end = Date.parse(e.end?.utc)
  const lat = parseFloat(e.venue?.latitude) || null, lng = parseFloat(e.venue?.longitude) || null
  return {
    title: e.name?.text ?? 'Event',
    cost: e.is_free ? 0 : null,
    // 24 hrs or more: Eventbrite doesn't tell us the daily hours, so the app shows "Varied duration".
    durationHrs: start && end && end - start < 86400000 ? Math.round(((end - start) / 3600000) * 10) / 10 : null,
    area: e.venue?.name ?? e.venue?.address?.city ?? '',
    lat, lng, startsAt: start || null, endsAt: end || null, url: e.url ?? null,
    // The event's picture, straight from Eventbrite's image server. The links are signed, so we can't resize them:
    // imageUrl is their small crop (450x200) for cards, imageLargeUrl the full picture for the activity page.
    imageUrl: e.logo?.url ?? null,
    imageLargeUrl: e.logo?.original?.url ?? null,
    // Full description when fetchDescriptions() got it, otherwise the short summary from the event list.
    description: htmlToText(e.fullDescription ?? e.description?.html) || e.summary?.trim() || null,
    seriesId: e.series_id ?? null,         // repeating events share this, so the app can show them as one card
    organiserId: e.organizer_id ?? null,   // so removing an organiser can also remove their events
  }
}

// Eventbrite descriptions are HTML. We keep plain text so the app never shows their HTML.
export const desc_max = 5000   // keep in sync with validActivity() in firestore.rules
export function htmlToText(html) {
  if (!html) return ''
  let text = html
  // 1. Tags that end a line become a new line, list items get a bullet.
  for (const tag of ['<br>', '<br/>', '<br />', '</p>', '</div>', '</li>', '</h1>', '</h2>', '</h3>']) {
    text = text.replaceAll(tag, '\n')
  }
  text = text.replaceAll('<li>', '• ')
  // 2. Remove every other tag: anything between < and >.
  text = text.replace(/<[^>]*>/g, '')
  // 3. Turn the common HTML codes back into characters.
  text = text.replaceAll('&nbsp;', ' ').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
  // 4. Trim every line and drop the empty ones.
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line !== '')
  text = lines.join('\n')
  // 5. Cut very long descriptions.
  if (text.length > desc_max) text = text.slice(0, desc_max - 1) + '…'
  return text
}

// Fields we guess ONCE when an event is first added. An admin can then fix them and a later sync leaves them alone.
export function defaultsFor(title, lat, lng) {
  const category = guessCategory(title)
  return {
    category, type: 'events', setting: null, energyLevel: guessEnergy(category), groupFriendly: true,
    region: regionOf(lat, lng), source: 'eventbrite', needsReview: true,
  }
}

// Lists the public live events of ONE organiser (any organiser id works, you don't need to own it).
export async function fetchOrganiserEvents(token, organiser) {
  const out = []
  let continuation = ''
  for (let page = 0; page < 10; page++) {   // safety cap: 10 pages per organiser
    const url = `https://www.eventbriteapi.com/v3/organizers/${organiser}/events/?status=live&expand=venue${continuation ? `&continuation=${continuation}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))   // e.g. { error: 'NOT_AUTHORIZED', error_description: '...' }
      throw new Error(`organiser ${organiser}: Eventbrite said ${res.status}${err.error_description ? ` (${err.error_description})` : ''}`)
    }
    const body = await res.json()
    out.push(...(body.events ?? []))
    if (!body.pagination?.has_more_items) break
    continuation = body.pagination.continuation
  }
  return out
}

// The event list only has a short summary; the full description is one extra call per event.
// Repeats of a series share a description, so each series is fetched once. A failed call keeps the summary.
export async function fetchDescriptions(token, events) {
  const seen = {}   // series (or event) id -> description we already fetched
  for (const e of events) {
    const key = e.series_id ?? e.id
    if (!(key in seen)) {
      seen[key] = null
      try {
        const res = await fetch(`https://www.eventbriteapi.com/v3/events/${e.id}/description/`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) seen[key] = (await res.json()).description ?? null
      } catch {
        // network problem: keep the summary
      }
    }
    if (seen[key]) e.fullDescription = seen[key]
  }
}

// Events we keep: not a business event and not over yet (one that is happening right now still counts).
const wanted = (e, now) => {
  const end = Date.parse(e.end?.utc ?? e.start?.utc)
  return !EXCLUDE.test(e.name?.text ?? '') && !(end < now)
}

// Events of all organisers, without duplicates. One failing organiser doesn't stop the others.
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

// Decides what to write to "activities". New events get our guessed defaults; existing ones only get
// the Eventbrite-owned fields (merge), so manual edits to category, energy etc. are kept.
// `existing` maps each stored activity id to its data.
// Eventbrite activities that have ended, or that Eventbrite no longer lists (cancelled, unpublished),
// are deleted. Not for organisers whose fetch failed this time: their events are unknown, not gone.
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
    if (a.source !== 'eventbrite' || live.has(id)) continue
    const end = a.endsAt ?? a.startsAt   // older activities have no endsAt yet
    const ended = end != null && end < now
    const unlisted = !failedOrganisers.includes(a.organiserId)
    if (ended || unlisted) { plan.deletes.push(id); plan.removed++ }
  }
  return plan
}
