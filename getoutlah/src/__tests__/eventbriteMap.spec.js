// Turning Eventbrite's raw events into our activities (shared by the admin sync button and the daily GitHub Action).
import { describe, it, expect } from 'vitest'
import { fromEventbrite, planActivityWrites, htmlToText } from '@/utils/eventbriteMap'

// Trimmed from a real Mapletree Arts in the City event.
const event = {
  id: '2001113878479',
  name: { text: 'Waterfront Escapades (Wind Band Marathon)' },
  url: 'https://www.eventbrite.sg/e/waterfront-escapades-wind-band-marathon-tickets-2001113878479',
  start: { utc: '2026-11-15T03:30:00Z' },
  end: { utc: '2026-11-15T13:00:00Z' },
  is_free: true,
  organizer_id: '49232782843',
  logo: {
    url: 'https://img.evbuc.com/small.jpg?h=200&w=450&s=abc',
    original: { url: 'https://img.evbuc.com/original.jpg?s=def' },
  },
  venue: { name: 'VivoCity, Amphitheatre', latitude: '1.2647139', longitude: '103.8231658' },
}

describe('fromEventbrite', () => {
  it('keeps the link, place, time and price', () => {
    const a = fromEventbrite(event)
    expect(a).toMatchObject({
      title: 'Waterfront Escapades (Wind Band Marathon)', url: event.url, area: 'VivoCity, Amphitheatre',
      lat: 1.2647139, lng: 103.8231658, cost: 0, durationHrs: 9.5, organiserId: '49232782843',
    })
  })

  it('uses the small picture for cards and the original for the activity page', () => {
    const a = fromEventbrite(event)
    expect(a.imageUrl).toBe('https://img.evbuc.com/small.jpg?h=200&w=450&s=abc')
    expect(a.imageLargeUrl).toBe('https://img.evbuc.com/original.jpg?s=def')
  })

  it('has no picture when the event has none', () => {
    const a = fromEventbrite({ ...event, logo: null })
    expect(a.imageUrl).toBeNull()
    expect(a.imageLargeUrl).toBeNull()
  })
})

describe('event description', () => {
  it('uses the full description as plain text, keeping line breaks', () => {
    const a = fromEventbrite({ ...event, fullDescription: '<div><p>Live <strong>music</strong> &amp; food.</p><ul><li>Free entry</li><li>All ages</li></ul></div>' })
    expect(a.description).toBe('Live music & food.\n• Free entry\n• All ages')
  })

  it('falls back to the summary, or nothing', () => {
    expect(fromEventbrite({ ...event, summary: 'A wind band plays all day.' }).description).toBe('A wind band plays all day.')
    expect(fromEventbrite(event).description).toBeNull()
  })

  it('never keeps HTML', () => {
    expect(htmlToText('<p>Hi</p><img src=x onerror=alert(1)>')).toBe('Hi')
  })

  it('cuts very long descriptions', () => {
    expect(htmlToText('a'.repeat(6000))).toHaveLength(5000)
  })
})

describe('planActivityWrites', () => {
  const now = Date.parse('2026-10-29T00:00:00Z')

  it('adds new events with guessed defaults, and only refreshes Eventbrite fields on existing ones', () => {
    const fresh = planActivityWrites([event], new Map(), now)
    expect(fresh).toMatchObject({ added: 1, updated: 0 })
    expect(fresh.writes[0]).toMatchObject({ id: 'eb-2001113878479', merge: false, data: { source: 'eventbrite', needsReview: true } })

    const again = planActivityWrites([event], new Map([['eb-2001113878479', { source: 'eventbrite' }]]), now)
    expect(again).toMatchObject({ added: 0, updated: 1 })
    expect(again.writes[0].merge).toBe(true)
    expect(again.writes[0].data).not.toHaveProperty('category')   // admin edits survive
  })

  it('skips past and business events', () => {
    const past = { ...event, id: '1', start: { utc: '2026-01-01T00:00:00Z' }, end: { utc: '2026-01-01T02:00:00Z' } }
    const summit = { ...event, id: '2', name: { text: 'Fintech Summit 2026' } }
    expect(planActivityWrites([past, summit], new Map(), now)).toMatchObject({ added: 0, skipped: 2 })
  })

  it('removes ended events and ones Eventbrite no longer lists, but keeps curated ones', () => {
    const existing = new Map([
      ['eb-2001113878479', { source: 'eventbrite', organiserId: '49232782843', startsAt: Date.parse('2026-11-15T03:30:00Z') }],
      ['eb-ended', { source: 'eventbrite', organiserId: '49232782843', startsAt: Date.parse('2026-10-01T00:00:00Z') }],
      ['eb-cancelled', { source: 'eventbrite', organiserId: '49232782843', startsAt: Date.parse('2026-12-01T00:00:00Z') }],
      ['s1', { source: 'curated' }],
    ])
    const plan = planActivityWrites([event], existing, now)
    expect(plan.deletes.sort()).toEqual(['eb-cancelled', 'eb-ended'])
    expect(plan.removed).toBe(2)
  })

  it('keeps an event that is happening right now', () => {
    const during = Date.parse('2026-11-15T08:00:00Z')   // between start and end
    const existing = new Map([['eb-2001113878479', { source: 'eventbrite', organiserId: '49232782843' }]])
    expect(planActivityWrites([event], existing, during)).toMatchObject({ updated: 1, removed: 0 })
  })

  it("doesn't remove upcoming events of an organiser whose fetch failed", () => {
    const existing = new Map([['eb-other', { source: 'eventbrite', organiserId: '999', startsAt: Date.parse('2026-12-01T00:00:00Z') }]])
    expect(planActivityWrites([], existing, now, ['999']).deletes).toEqual([])
  })
})
