import { describe, expect, it } from 'vitest'
import { INTERESTS } from '@/config/preferences'
import { MAP_ACTIVITY_CATEGORY_IDS, getMapActivityCategory } from '@/config/mapActivityCategories'
import { seedActivities } from '@/data/seedActivities'

describe('curated activity dataset', () => {
  it('uses one canonical category and curated source for every activity', () => {
    const categoryIds = INTERESTS.map((interest) => interest.id)

    for (const activity of seedActivities) {
      expect(categoryIds).toContain(activity.category)
      expect(activity.source).toBe('curated')
      expect(activity).not.toHaveProperty('tags')
      expect(activity.description.length).toBeGreaterThan(0)
      expect(activity.description.length).toBeLessThanOrEqual(1000)   // the curated limit in firestore.rules
      expect(Number.isFinite(activity.lat)).toBe(true)
      expect(Number.isFinite(activity.lng)).toBe(true)
    }
  })

  it('includes a marker presentation for every canonical category', () => {
    expect(MAP_ACTIVITY_CATEGORY_IDS).toEqual(INTERESTS.map((interest) => interest.id))
    for (const categoryId of MAP_ACTIVITY_CATEGORY_IDS) {
      const category = getMapActivityCategory(categoryId)
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(category.icon).toMatch(/^bi-/)
    }
  })

  it('covers every primary category in curated fallback data', () => {
    expect(new Set(seedActivities.map((activity) => activity.category))).toEqual(
      new Set(INTERESTS.map((interest) => interest.id)),
    )
  })
})
