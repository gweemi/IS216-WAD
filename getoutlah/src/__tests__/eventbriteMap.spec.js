// Turning Eventbrite's raw events into our activities (shared by the admin sync button and the daily GitHub Action).
import { describe, it, expect } from 'vitest'
import { fromEventbrite, planActivityWrites } from '@/utils/eventbriteMap'

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

describe('planActivityWrites', () => {
  const now = Date.parse('2026-10-29T00:00:00Z')

  it('adds new events with guessed defaults, and only refreshes Eventbrite fields on existing ones', () => {
    const fresh = planActivityWrites([event], new Set(), now)
    expect(fresh).toMatchObject({ added: 1, updated: 0 })
    expect(fresh.writes[0]).toMatchObject({ id: 'eb-2001113878479', merge: false, data: { source: 'eventbrite', needsReview: true } })

    const again = planActivityWrites([event], new Set(['eb-2001113878479']), now)
    expect(again).toMatchObject({ added: 0, updated: 1 })
    expect(again.writes[0].merge).toBe(true)
    expect(again.writes[0].data).not.toHaveProperty('category')   // admin edits survive
  })

  it('skips past and business events', () => {
    const past = { ...event, id: '1', start: { utc: '2026-01-01T00:00:00Z' } }
    const summit = { ...event, id: '2', name: { text: 'Fintech Summit 2026' } }
    expect(planActivityWrites([past, summit], new Set(), now)).toMatchObject({ added: 0, skipped: 2 })
  })
})
