// Turns raw Eventbrite events into OUR activities. No Firebase and no browser-only code, so both the
// admin page (src/services/api/eventbriteSync.js) and the scheduled GitHub Action (scripts/sync-eventbrite.mjs) use it.

// Starting list of organisers to sync. Admins change the real list on /admin/activities
// (saved in Firestore config/eventbrite); this is only used until they do.
export const DEFAULT_ORGANISERS = [
  { id: '18480976563', name: 'MarketWise ASIA' },
  { id: '121304643898', name: 'WELOVESUPERMOM' },
  { id: '26202793543', name: 'Affordable Art Fair Singapore' },
  { id: '115820118091', name: 'Vamp Productions' },
  { id: '121730758969', name: 'Atomic Events Global' },
  { id: '110303953351', name: 'Toy Space' },
  { id: '34519717313', name: 'Singapore Clay Festival' },
  { id: '7654330861', name: 'INSEAD' },
  { id: '67918342533', name: 'Tanglin Trust School' },
  { id: '121381255451', name: 'Singapore Catalysis Society' },
]

// Titles matching this are skipped (business events aren't what students look for). Edit freely.
export const EXCLUDE = /conference|summit|forum|webinar|seminar|symposium|trimester|networking|b2b/i

// First match wins. Values are the onboarding interest ids.
const RULES = [
  ['volunteering', /volunteer|charity|fundrais|clean-?up/i],
  ['sports', /run\b|marathon|fitness|sport|cycling|badminton|football|futsal|climb|swim|skate/i],
  ['outdoors', /hike|trail|park|garden|nature|beach|kayak|camp/i],
  ['wellness', /yoga|wellness|meditat|mindful|pilates|spa\b/i],
  ['workshops', /workshop|class\b|clay|pottery|craft|diy|cooking class|masterclass|festival.*(clay|craft)/i],
  ['food', /food|wine|beer|coffee|dining|brunch|tasting|hawker|dessert/i],
  ['events', /concert|music|live\b|band|orchestra|dj\b|gig|festival|market|pop-?up/i],
  ['games', /game|gaming|board ?game|esports|model|cat\b|toy|puzzle/i],
  ['arts', /art|museum|exhibit|gallery|theatre|theater|dance|film|heritage/i],
]
export const guessCategory = (title = '') => RULES.find(([, re]) => re.test(title))?.[0] ?? 'arts'

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
    durationHrs: start && end ? Math.round(((end - start) / 3600000) * 10) / 10 : null,
    area: e.venue?.name ?? e.venue?.address?.city ?? '',
    lat, lng, startsAt: start || null, url: e.url ?? null,
    // The event's picture, straight from Eventbrite's image server. The links are signed, so we can't resize them:
    // imageUrl is their small crop (450x200) for cards, imageLargeUrl the full picture for the activity page.
    imageUrl: e.logo?.url ?? null,
    imageLargeUrl: e.logo?.original?.url ?? null,
    seriesId: e.series_id ?? null,         // repeating events share this, so the app can show them as one card
    organiserId: e.organizer_id ?? null,   // so removing an organiser can also remove their events
  }
}

// Fields we guess ONCE when an event is first added. An admin can then fix them and a later sync leaves them alone.
export function defaultsFor(title, lat, lng) {
  const category = guessCategory(title)
  return {
    category, type: 'events', setting: null, energyLevel: guessEnergy(category), groupFriendly: true,
    region: regionOf(lat, lng), slotsLeft: null, source: 'eventbrite', needsReview: true,
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

// Events of all organisers, without duplicates. One failing organiser doesn't stop the others.
export async function fetchEvents(token, organiserIds) {
  const byId = new Map(), failures = []
  for (const organiser of organiserIds) {
    try { (await fetchOrganiserEvents(token, organiser)).forEach((e) => byId.set(e.id, e)) }
    catch (e) { failures.push(e.message) }
  }
  if (!byId.size && failures.length) throw new Error(failures.join('; '))
  return { events: [...byId.values()], failures }
}

// Decides what to write to "activities". New events get our guessed defaults; existing ones only get
// the Eventbrite-owned fields (merge), so manual edits to category, energy etc. are kept.
export function planActivityWrites(events, existingIds, now = Date.now()) {
  const plan = { writes: [], added: 0, updated: 0, skipped: 0 }
  for (const e of events) {
    const base = fromEventbrite(e)
    if (EXCLUDE.test(base.title) || (base.startsAt && base.startsAt < now)) { plan.skipped++; continue }
    const id = `eb-${e.id}`
    if (existingIds.has(id)) { plan.writes.push({ id, data: base, merge: true }); plan.updated++ }
    else { plan.writes.push({ id, data: { ...base, ...defaultsFor(base.title, base.lat, base.lng) }, merge: false }); plan.added++ }
  }
  return plan
}
