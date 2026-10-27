import { describe, expect, it } from 'vitest'
import { MAP_ACTIVITY_CATEGORY_IDS, getMapActivityCategory } from '@/config/mapActivityCategories'
import { MAP_DEMO_ACTIVITIES } from '@/data/mapDemoActivities'

const requiredKeys = [
  'id', 'title', 'description', 'category', 'tags', 'activityType', 'region', 'locationName', 'address',
  'lat', 'lng', 'startDateTime', 'endDateTime', 'openingHours', 'energy', 'cost', 'duration', 'isOpenJio',
  'source', 'externalId', 'externalUrl', 'imageUrl',
]

describe('map demo activities', () => {
  it('uses one standard schema for all 20 map-only records', () => {
    expect(MAP_DEMO_ACTIVITIES).toHaveLength(20)
    for (const activity of MAP_DEMO_ACTIVITIES) {
      expect(Object.keys(activity).sort()).toEqual([...requiredKeys].sort())
      expect(MAP_ACTIVITY_CATEGORY_IDS).toContain(activity.category)
      expect(['scheduled', 'anytime']).toContain(activity.activityType)
      expect(Array.isArray(activity.tags)).toBe(true)
      expect(Number.isFinite(activity.lat)).toBe(true)
      expect(Number.isFinite(activity.lng)).toBe(true)
    }
  })

  it('represents every map category with configured colour and icon metadata', () => {
    const presentCategories = new Set(MAP_DEMO_ACTIVITIES.map((activity) => activity.category))

    expect([...presentCategories].sort()).toEqual([...MAP_ACTIVITY_CATEGORY_IDS].sort())
    for (const categoryId of MAP_ACTIVITY_CATEGORY_IDS) {
      const category = getMapActivityCategory(categoryId)
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(category.icon).toMatch(/^bi-/)
    }
  })

  it('spreads markers across Singapore rather than concentrating them downtown', () => {
    const latitudes = MAP_DEMO_ACTIVITIES.map((activity) => activity.lat)
    const longitudes = MAP_DEMO_ACTIVITIES.map((activity) => activity.lng)
    const regions = new Set(MAP_DEMO_ACTIVITIES.map((activity) => activity.region))

    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(0.18)
    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeGreaterThan(0.28)
    for (const region of ['north', 'south', 'east', 'west', 'central']) {
      expect(regions).toContain(region)
    }
  })
})
