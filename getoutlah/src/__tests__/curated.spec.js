import { describe, it, expect } from 'vitest'
import { emptyCurated, toCuratedActivity } from '@/utils/curated'

const filled = (over = {}) => ({ ...emptyCurated(), title: 'Pottery taster', area: 'Bugis', lat: '1.3009', lng: '103.8559', ...over })

describe('curated activity form', () => {
  it('turns a filled form into an activity', () => {
    const { problems, activity } = toCuratedActivity(filled({ cost: '25', slotsLeft: '' }))
    expect(problems).toEqual([])
    expect(activity).toMatchObject({ title: 'Pottery taster', cost: 25, slotsLeft: null, lat: 1.3009, region: 'central', source: 'curated', url: null })
  })

  it('treats an empty price as "price varies"', () => {
    expect(toCuratedActivity(filled({ cost: '' })).activity.cost).toBeNull()
  })

  it('needs a title and a location in Singapore', () => {
    const { problems } = toCuratedActivity({ ...emptyCurated(), lat: '35.6', lng: '139.7' })
    expect(problems).toContain('Give it a title.')
    expect(problems).toContain('Pick a location in Singapore.')
  })

  it('rejects a negative price and a bad category', () => {
    const { problems } = toCuratedActivity(filled({ cost: '-5', category: 'music' }))
    expect(problems).toContain('Pick a category.')
    expect(problems.some((p) => p.startsWith('Price'))).toBe(true)
  })
})
