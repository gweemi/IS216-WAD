import { describe, expect, it } from 'vitest'
import { ACTIVITY_SOURCES, activityFromCollection, collectionForActivitySource } from '@/utils/activitySource'
import { classifyLegacyActivity, destinationPathForActivity } from '@/utils/activityMigration'

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

describe('legacy activity migration', () => {
  it('canonicalises old sources while preserving all other fields', () => {
    expect(classifyLegacyActivity({ source: 'eventbrite', title: 'Festival', needsReview: true }, 'eb-1')).toEqual({
      source: ACTIVITY_SOURCES.EXTERNAL,
      collection: 'externalListings',
      data: { source: ACTIVITY_SOURCES.EXTERNAL, title: 'Festival', needsReview: true },
    })
  })

  it('rejects documents that cannot be safely classified', () => {
    expect(() => classifyLegacyActivity({ title: 'Unknown' }, 'x1')).toThrow('unsupported source')
    expect(() => classifyLegacyActivity({ source: 'openJio' }, 'j1')).toThrow('unsupported source')
  })

  it('preserves descendant paths when moving a document tree', () => {
    const activity = classifyLegacyActivity({ source: 'curated' }, 'pick-1')
    expect(destinationPathForActivity({ id: 'pick-1', collection: activity.collection }, 'activities/pick-1/notes/n1'))
      .toBe('getoutlahPicks/pick-1/notes/n1')
  })
})
