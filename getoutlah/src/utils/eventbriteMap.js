// Turns raw Eventbrite events into OUR activities. No Firebase and no browser-only code, so both the
// admin page (src/services/api/eventbriteSync.js) and the scheduled GitHub Action (scripts/sync-eventbrite.mjs) use it.

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

export const parseOrganizerIds = (text = '') => text.split(/[\s,]+/).filter(Boolean)

// Lists the public live events of ONE organiser (any organiser id works, you don't need to own it).
export async function fetchOrganizerEvents(token, organizer) {
  const out = []
  let continuation = ''
  for (let page = 0; page < 10; page++) {   // safety cap: 10 pages per organiser
    const url = `https://www.eventbriteapi.com/v3/organizers/${organizer}/events/?status=live&expand=venue${continuation ? `&continuation=${continuation}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`organiser ${organizer}: Eventbrite said ${res.status}`)
    const body = await res.json()
    out.push(...(body.events ?? []))
    if (!body.pagination?.has_more_items) break
    continuation = body.pagination.continuation
  }
  return out
}

// Events of all organisers, without duplicates. One failing organiser doesn't stop the others.
export async function fetchEvents(token, organizerIds) {
  const byId = new Map(), failures = []
  for (const organizer of organizerIds) {
    try { (await fetchOrganizerEvents(token, organizer)).forEach((e) => byId.set(e.id, e)) }
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
