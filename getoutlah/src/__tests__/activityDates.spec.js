import { describe, it, expect } from 'vitest'
import { datesOf, oneCardPerEvent } from '@/stores/activities'

const NOW = Date.parse('2026-11-01T00:00:00Z')
const day = (n) => NOW + n * 86400000
const list = [
  { id: 'eb-3', title: 'Clay Jam', area: 'Bugis', startsAt: day(3), seriesId: 's1' },
  { id: 'eb-1', title: 'Clay Jam', area: 'Bugis', startsAt: day(1), seriesId: 's1' },
  { id: 'eb-0', title: 'Clay Jam', area: 'Bugis', startsAt: day(-2), seriesId: 's1' },   // already over
  { id: 's5', title: 'Board Game Blitz', area: 'Tiong Bahru' },
  { id: 'x1', title: 'Board game blitz ', area: 'Tiong Bahru' },                         // same title + place, no series
  { id: 'x2', title: 'Board Game Blitz', area: 'Tampines' },                             // different place
]

describe('repeating events', () => {
  it('lists the upcoming dates of a series, soonest first', () => {
    expect(datesOf(list[0], list, NOW).map((a) => a.id)).toEqual(['eb-1', 'eb-3'])
  })

  it('groups events without a series by title and place', () => {
    expect(datesOf(list[3], list, NOW).map((a) => a.id)).toEqual(['s5', 'x1'])
  })

  it('shows one card per event, keeping the first (best-ranked) one', () => {
    expect(oneCardPerEvent(list).map((a) => a.id)).toEqual(['eb-3', 's5', 'x2'])
  })
})
