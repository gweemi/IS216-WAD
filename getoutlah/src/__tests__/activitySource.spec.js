import { describe, expect, it } from 'vitest'
import { ACTIVITY_SOURCES, canonicalActivity, canonicalSource, isActivitySource, sourceLabel } from '@/utils/activitySource'

describe('activity sources', () => {
  it('maps every legacy Firestore source to its canonical replacement', () => {
    expect(canonicalSource('curated')).toBe(ACTIVITY_SOURCES.PICKS)
    expect(canonicalSource('eventbrite')).toBe(ACTIVITY_SOURCES.EXTERNAL)
    expect(canonicalSource('openjio')).toBe(ACTIVITY_SOURCES.OPEN_JIO)
  })

  it('normalises loaded records without mutating their other fields', () => {
    expect(canonicalActivity({ id: 'legacy-pick', title: 'Walk', source: 'curated' }))
      .toEqual({ id: 'legacy-pick', title: 'Walk', source: ACTIVITY_SOURCES.PICKS })
    expect(canonicalActivity({ id: 'legacy-external', source: 'eventbrite' }).source)
      .toBe(ACTIVITY_SOURCES.EXTERNAL)
    expect(canonicalActivity({ id: 'current', source: ACTIVITY_SOURCES.OPEN_JIO }).source)
      .toBe(ACTIVITY_SOURCES.OPEN_JIO)
  })

  it('exposes only the three canonical values and labels', () => {
    expect(isActivitySource('getoutlahPicks')).toBe(true)
    expect(isActivitySource('externalListings')).toBe(true)
    expect(isActivitySource('openJio')).toBe(true)
    expect(isActivitySource('eventbrite')).toBe(false)
    expect(sourceLabel('openJio')).toBe('OPENJIO!')
  })
})
