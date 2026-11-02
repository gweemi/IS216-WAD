import { describe, it, expect } from 'vitest'
import { emptyCurated, toCuratedActivity } from '@/utils/curated'

const filled = (over = {}) => ({ ...emptyCurated(), title: 'Pottery taster', description: '  Make a bowl in two hours.  ', area: 'Bugis', lat: '1.3009', lng: '103.8559', ...over })

describe('curated activity form', () => {
  it('turns a filled form into an activity', () => {
    const { problems, activity } = toCuratedActivity(filled({ cost: '25' }))
    expect(problems).toEqual([])
    expect(activity).toMatchObject({ title: 'Pottery taster', cost: 25, lat: 1.3009, region: 'central', source: 'curated', url: null })
  })

  it('has no slots (only OpenJio!s have slots)', () => {
    expect(toCuratedActivity(filled()).activity).not.toHaveProperty('slotsLeft')
  })

  it('treats an empty price as "price varies"', () => {
    expect(toCuratedActivity(filled({ cost: '' })).activity.cost).toBeNull()
  })

  it('needs a title and a location in Singapore', () => {
    const { problems } = toCuratedActivity({ ...emptyCurated(), lat: '35.6', lng: '139.7' })
    expect(problems).toContain('Give it a title.')
    expect(problems).toContain('Pick a location in Singapore.')
  })

  it('needs a description, saved without extra spaces and at most 1000 characters', () => {
    expect(toCuratedActivity(filled()).activity.description).toBe('Make a bowl in two hours.')
    expect(toCuratedActivity(filled({ description: '   ' })).problems).toContain('Add a description.')
    expect(toCuratedActivity(filled({ description: 'x'.repeat(1001) })).problems.some((p) => p.includes('description'))).toBe(true)
  })

  it('rejects a negative price and a bad category', () => {
    const { problems } = toCuratedActivity(filled({ cost: '-5', category: 'music' }))
    expect(problems).toContain('Pick a category.')
    expect(problems.some((p) => p.startsWith('Price'))).toBe(true)
  })
})
