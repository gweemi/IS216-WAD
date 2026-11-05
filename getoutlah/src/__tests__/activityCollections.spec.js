import { describe, expect, it } from 'vitest'
import { ACTIVITY_SOURCES, activityFromCollection, collectionForActivitySource } from '@/utils/activitySource'

describe('activity collection ownership', () => {
  it('maps each canonical stored source to its collection', () => {
    expect(collectionForActivitySource(ACTIVITY_SOURCES.PICKS)).toBe('getoutlahPicks')
    expect(collectionForActivitySource(ACTIVITY_SOURCES.EXTERNAL)).toBe('externalListings')
    expect(collectionForActivitySource(ACTIVITY_SOURCES.OPEN_JIO)).toBeNull()
  })

  it('rejects a document whose stored source disagrees with its collection', () => {
    expect(() => activityFromCollection({ id: 'eb-1', source: ACTIVITY_SOURCES.PICKS }, ACTIVITY_SOURCES.EXTERNAL))
      .toThrow('expected "externalListings"')
  })
})
