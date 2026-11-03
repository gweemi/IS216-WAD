import { describe, expect, it } from 'vitest'
import { INTERESTS } from '@/config/preferences'
import { MAP_ACTIVITY_CATEGORY_IDS, getMapActivityCategory } from '@/config/mapActivityCategories'
import { seedActivities } from '@/data/seedActivities'

describe('GetOutLah Picks fallback dataset', () => {
  it('uses one canonical category and GetOutLah Picks source for every activity', () => {
    const categoryIds = INTERESTS.map((interest) => interest.id)

    for (const activity of seedActivities) {
      expect(categoryIds).toContain(activity.category)
      expect(activity.source).toBe('getoutlahPicks')
      expect(activity).not.toHaveProperty('tags')
      expect(activity.description.length).toBeGreaterThan(0)
      expect(activity.description.length).toBeLessThanOrEqual(1000)   // the GetOutLah Picks limit in firestore.rules
      expect(Number.isFinite(activity.lat)).toBe(true)
      expect(Number.isFinite(activity.lng)).toBe(true)
    }
  })

  it('includes a marker presentation for every canonical category', () => {
    expect(MAP_ACTIVITY_CATEGORY_IDS).toEqual(INTERESTS.map((interest) => interest.id))
    for (const categoryId of MAP_ACTIVITY_CATEGORY_IDS) {
      const category = getMapActivityCategory(categoryId)
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(category.icon).toMatch(/^[a-z-]+$/)
      expect(category.emoji).toBe(INTERESTS.find((interest) => interest.id === categoryId)?.emoji)
    }
  })

  it('covers every primary category in the fallback data', () => {
    expect(new Set(seedActivities.map((activity) => activity.category))).toEqual(
      new Set(INTERESTS.map((interest) => interest.id)),
    )
  })
})
