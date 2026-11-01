// Eventbrite only gives the first start and last end, so events of 24 hrs or more show "Varied duration".
import { describe, expect, it } from 'vitest'
import { fromEventbrite } from '@/utils/eventbriteMap'
import { durationText, fitsHours, isVaried } from '@/utils/activityStyle'
import { activeFilterPills } from '@/utils/activeFilters'
import { buildPlans } from '@/utils/profile'

const HOUR = 3600000
const timed = (startUtc, endUtc) => fromEventbrite({ start: { utc: startUtc }, end: { utc: endUtc } })
const sameDay = timed('2026-11-07T02:00:00Z', '2026-11-07T07:00:00Z')       // 5 hrs
const twoDays = timed('2026-11-07T02:00:00Z', '2026-11-08T07:00:00Z')       // 29 hrs
const threeDays = timed('2026-11-06T02:00:00Z', '2026-11-09T02:00:00Z')     // exactly 72 hrs

describe('Eventbrite duration', () => {
  it('keeps the real length of events under 24 hrs', () => {
    expect(sameDay.durationHrs).toBe(5)
    expect(timed('2026-11-07T14:00:00Z', '2026-11-08T13:30:00Z').durationHrs).toBe(23.5)
    expect(durationText(sameDay)).toBe('5 hr')
    expect(isVaried(sameDay)).toBe(false)
  })

  it('shows no number from 24 hrs up', () => {
    for (const a of [twoDays, threeDays, timed('2026-11-07T02:00:00Z', '2026-11-08T02:00:00Z')]) {
      expect(a.durationHrs).toBeNull()
      expect(isVaried(a)).toBe(true)
      expect(durationText(a)).toBe('Varied duration')
    }
  })

  it('still says ? when a time or the duration is missing', () => {
    expect(durationText({ durationHrs: null })).toBe('? hr')
    expect(durationText(fromEventbrite({ start: { utc: '2026-11-07T02:00:00Z' } }))).toBe('? hr')
  })
})

describe('fitsHours', () => {
  it('shows varied events only under their own tag', () => {
    expect(fitsHours(threeDays, 'varied')).toBe(true)
    expect(fitsHours(threeDays, 3)).toBe(false)
    expect(fitsHours(sameDay, 'varied')).toBe(false)
  })

  it('still compares normal events to the limit', () => {
    expect(fitsHours(sameDay, 3)).toBe(false)
    expect(fitsHours({ durationHrs: 2 }, 2)).toBe(true)
  })

  it('lets activities with an unknown duration through a limit, but not the varied tag', () => {
    expect(fitsHours({ durationHrs: null }, 1)).toBe(true)
    expect(fitsHours({ durationHrs: null }, 'varied')).toBe(false)
  })
})

describe('other places that use duration', () => {
  it('labels the active filter pill', () => {
    const f = { categories: [], sources: [], maxCost: null, maxHours: 'varied', setting: 'Any', energy: 'Any' }
    expect(activeFilterPills(f).map((p) => p.label)).toEqual(['Varied duration'])
  })

  it('keeps a multi-day event in plans until it really ends', () => {
    const a = { id: 'a1', title: 'Fair', ...threeDays }
    const plans = (now) => buildPlans({ planIds: ['a1'], findActivity: () => a, jios: [], uid: 'me', now })
    expect(plans(new Date(a.startsAt + 30 * HOUR))).toHaveLength(1)
    expect(plans(new Date(a.endsAt + HOUR))).toHaveLength(0)
  })
})
