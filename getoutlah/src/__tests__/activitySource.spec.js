import { describe, expect, it } from 'vitest'
import { isActivitySource, sourceLabel } from '@/utils/activitySource'

describe('activity sources', () => {
  it('exposes only the three canonical values and labels', () => {
    expect(isActivitySource('getoutlahPicks')).toBe(true)
    expect(isActivitySource('externalListings')).toBe(true)
    expect(isActivitySource('openJio')).toBe(true)
    expect(isActivitySource('legacy-source')).toBe(false)
    expect(sourceLabel('openJio')).toBe('OPENJIO!')
  })
})
