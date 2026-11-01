import { describe, expect, it } from 'vitest'
import { activeFilterPills } from '@/utils/activeFilters'

const defaults = () => ({
  query: '', categories: [], sources: [],
  maxCost: null, maxHours: null, setting: 'Any', energy: 'Any', onlySlots: false,
  nearMe: false, radiusKm: 5, prioritiseFreeTime: false,
})

describe('activeFilterPills', () => {
  it('shows nothing for the default filters, the search box or the free-time switch', () => {
    expect(activeFilterPills({ ...defaults(), query: 'yoga', prioritiseFreeTime: true })).toEqual([])
  })

  it('labels every filter in use like the filter sheet does', () => {
    const f = { ...defaults(), sources: ['eventbrite'], maxCost: 0, maxHours: 2, setting: 'Indoor', energy: 'low', onlySlots: true, nearMe: true, radiusKm: 8 }
    expect(activeFilterPills(f).map((p) => p.label)).toEqual(['Limited', 'Free', '2 hr or less', 'Indoor', 'Chill', 'Has slots', 'Within 8 km'])
  })

  it('counts a Free budget as in use even though it is 0', () => {
    expect(activeFilterPills({ ...defaults(), maxCost: 0 })).toHaveLength(1)
  })

  it('removes only the filter whose pill was pressed', () => {
    const f = { ...defaults(), categories: ['arts', 'food'], maxCost: 10 }
    activeFilterPills(f).find((p) => p.id === 'category-arts').remove()
    expect(f.categories).toEqual(['food'])
    expect(f.maxCost).toBe(10)
    activeFilterPills(f).find((p) => p.id === 'budget').remove()
    expect(f.maxCost).toBeNull()
  })
})
