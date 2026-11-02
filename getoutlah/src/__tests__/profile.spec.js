// Profile page helpers: names, lists (saved / plans / completed), moods, suggestions.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateDisplayName,
  handleFor,
  initialsFor,
  firstName,
  savedActivities,
  buildPlans,
  moodLists,
  wellbeingSuggestions,
} from '@/utils/profile'

const activities = [
  { id: 'a1', title: 'Pottery', category: 'workshops', startsAt: Date.parse('2026-11-05T10:00:00'), durationHrs: 2 },
  { id: 'a2', title: 'Sunset kayak', category: 'outdoors', startsAt: null },
  { id: 'a3', title: 'Old gig', category: 'events', startsAt: Date.parse('2026-10-01T20:00:00') },
]
const find = (id) => activities.find((a) => a.id === id)
const now = new Date('2026-10-29T12:00:00')

const jio = (over) => ({
  id: 'j1',
  title: 'Badminton',
  category: 'sports',
  hostId: 'host',
  participants: ['host', 'me'],
  waitlist: [],
  capacity: 4,
  status: 'open',
  visibility: 'public',
  startAt: new Date('2026-11-01T18:00:00'),
  durationMins: 120,
  ...over,
})

describe('display name', () => {
  it('needs 1 to 40 characters', () => {
    expect(validateDisplayName('  ')).not.toBe('')
    expect(validateDisplayName('x'.repeat(41))).not.toBe('')
    expect(validateDisplayName(' En Min ')).toBe('')
  })
  it('makes a handle, initials and a first name', () => {
    expect(handleFor('enmin.seah.2025@smu.edu.sg')).toBe('@enmin.seah.2025')
    expect(initialsFor('En Min Seah')).toBe('EM')
    expect(initialsFor('')).toBe('?')
    expect(firstName('En Min Seah')).toBe('En')
  })
})

describe('saved', () => {
  it('skips activities that no longer exist', () => {
    expect(savedActivities(['a2', 'gone'], find).map((a) => a.id)).toEqual(['a2'])
  })
})

describe('my plans', () => {
  it('combines joined activities and my OPENJIOs, soonest first', () => {
    const plans = buildPlans({ planIds: ['a2', 'a1'], findActivity: find, jios: [jio()], uid: 'me', now })
    expect(plans.map((p) => p.key)).toEqual(['j-j1', 'a-a1', 'a-a2'])
    expect(plans[0]).toMatchObject({ kind: 'jio', role: 'going', to: '/openjio' })
  })

  it('leaves out finished, cancelled, completed and other people’s jios', () => {
    const plans = buildPlans({
      planIds: ['a1', 'a3'],
      findActivity: find,
      jios: [jio({ id: 'x', participants: ['host'] }), jio({ id: 'c', status: 'cancelled' })],
      uid: 'me',
      completedIds: ['a1'],
      now,
    })
    expect(plans).toEqual([])
  })

  it('shows hosting and queued jios too', () => {
    const plans = buildPlans({
      jios: [jio({ id: 'h', hostId: 'me', participants: ['me'] }), jio({ id: 'q', participants: ['host'], waitlist: ['me'] })],
      findActivity: find,
      uid: 'me',
      now,
    })
    expect(plans.map((p) => p.role).sort()).toEqual(['host', 'queued'])
  })
})

describe('activity moods lists', () => {
  it('splits completed activities into to-rate and rated', () => {
    const completed = [
      { id: 'a1', title: 'Pottery', date: '2026-10-01' },
      { id: 'a2', title: 'Kayak', date: '2026-10-20' },
    ]
    const entries = [{ id: 'r1', activityId: 'a1', mood: 3 }, { id: 'r2', activityId: 'a2', mood: null }]
    const { toRate, rated } = moodLists(completed, entries)
    expect(toRate.map((a) => a.id)).toEqual(['a2'])
    expect(rated.map((r) => r.id)).toEqual(['r1'])
  })
})

describe('wellbeing suggestions', () => {
  const list = [
    { id: '1', title: 'HIIT', category: 'sports', energyLevel: 'high' },
    { id: '2', title: 'Yoga', category: 'wellness', energyLevel: 'low', cost: 0 },
    { id: '3', title: 'Climb', category: 'sports', energyLevel: 'medium' },
  ]
  it('suggests calm things when running low', () => {
    expect(wellbeingSuggestions(32, list)[0].title).toBe('Yoga')
  })
  it('suggests things they like when doing well', () => {
    expect(wellbeingSuggestions(80, list, ['sports']).map((a) => a.title).sort()).toEqual(['Climb', 'HIIT'])
  })
})

// ---------- Stores (localStorage, no Firebase) ----------
describe('activity mood ratings', async () => {
  const { reflections } = await import('@/stores/reflections.js')
  const { rateActivity, moodFor } = await import('@/stores/activityMoods')

  beforeEach(() => {
    reflections.entries.splice(0)
    reflections.pending.splice(0)
  })

  it('rates a completed activity and clears its "How was it?" prompt', () => {
    reflections.pending.push({ activityId: 'a9', activityTitle: 'Kayak' })
    rateActivity({ id: 'a9', title: 'Kayak', category: 'outdoors' }, 4)
    expect(moodFor('a9')).toBe(4)
    expect(reflections.pending).toHaveLength(0)
  })

  it('changes the mood instead of adding a second rating', () => {
    rateActivity({ id: 'a9', title: 'Kayak' }, 4)
    rateActivity({ activityId: 'a9', activityTitle: 'Kayak' }, 2)
    expect(reflections.entries).toHaveLength(1)
    expect(moodFor('a9')).toBe(2)
  })
})

describe('wellbeing check-in points', async () => {
  const g = await import('@/stores/gamification(badges).js')

  beforeEach(() => g.resetGamification(false))

  it('gives points once every 14 days and counts towards the level', () => {
    const first = g.awardWellbeingCheckIn()
    expect(first.pointsGiven).toBe(g.POINTS_PER_WELLBEING_CHECKIN)
    expect(g.totalPoints()).toBe(g.POINTS_PER_WELLBEING_CHECKIN)

    const again = g.awardWellbeingCheckIn()
    expect(again.pointsGiven).toBe(0)
    expect(g.daysUntilWellbeingPoints()).toBe(14)
  })

  it('respects the weekly points cap', () => {
    g.game.ledger.push({ date: new Date().toLocaleDateString('en-CA'), amount: g.WEEKLY_POINT_CAP, reason: 'test' })
    expect(g.awardWellbeingCheckIn().pointsGiven).toBe(0)
  })
})
