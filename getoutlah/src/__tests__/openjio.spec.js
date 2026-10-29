// Checks the OPENJIO! rules: creating, joining, choping and leaving.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { INTERESTS } from '@/config/preferences'
import {
  validateJio,
  statusOf,
  slotsLeft,
  myRole,
  queuePosition,
  canSee,
  isInvited,
  applyJoin,
  applyChope,
  applyLeave,
  applyLeaveQueue,
  statusLabel,
  toActivity,
  prefillFromActivity,
  REGIONS,
} from '@/utils/openjio'

const NOW = new Date('2026-11-02T10:00:00')
const TOMORROW = new Date('2026-11-03T15:00:00')

// A jio with 3 spots: the host plus 2 others
function makeJio(changes = {}) {
  return {
    id: 'j1',
    title: 'Badminton doubles',
    category: 'sports',
    location: 'SMU Sports Hall',
    region: 'central',
    startAt: TOMORROW,
    durationMins: 120,
    cost: 5,
    capacity: 3,
    visibility: 'public',
    hostId: 'host',
    hostName: 'Li Min',
    participants: ['host'],
    waitlist: [],
    status: 'open',
    ...changes,
  }
}

const goodForm = {
  title: 'Badminton doubles',
  category: 'sports',
  location: 'SMU Sports Hall',
  region: 'central',
  startAt: TOMORROW,
  durationMins: 120,
  cost: 5,
  capacity: 6,
  visibility: 'public',
  description: '',
}

describe('validateJio', () => {
  it('accepts a complete form', () => {
    expect(validateJio(goodForm, NOW)).toEqual([])
  })

  it('accepts a friends-only jio with invited friends', () => {
    expect(validateJio({ ...goodForm, visibility: 'friends', invited: ['f1'] }, NOW)).toEqual([])
  })

  it.each([
    ['no name', { title: '   ' }],
    ['a name that is too long', { title: 'x'.repeat(61) }],
    ['an unknown category', { category: 'skydiving' }],
    ['no location', { location: '' }],
    ['an unknown region', { region: 'mars' }],
    ['no start time', { startAt: null }],
    ['a start time in the past', { startAt: new Date('2026-11-01T10:00:00') }],
    ['a 5-minute jio', { durationMins: 5 }],
    ['a negative cost', { cost: -1 }],
    ['only 1 spot (just the host)', { capacity: 1 }],
    ['too many spots', { capacity: 51 }],
    ['half a spot', { capacity: 2.5 }],
    ['an unknown visibility', { visibility: 'secret' }],
    ['a friends-only jio with nobody invited', { visibility: 'friends', invited: [] }],
  ])('rejects %s', (_, change) => {
    expect(validateJio({ ...goodForm, ...change }, NOW).length).toBeGreaterThan(0)
  })
})

describe('status and spots', () => {
  it('counts spots left', () => {
    expect(slotsLeft(makeJio())).toBe(2)
    expect(statusLabel(makeJio(), NOW)).toBe('Open · 2 spots left')
  })

  it('is full when every spot is taken', () => {
    const jio = makeJio({ participants: ['host', 'a', 'b'] })
    expect(statusOf(jio, NOW)).toBe('full')
    expect(slotsLeft(jio)).toBe(0)
  })

  it('is ended once the end time has passed', () => {
    expect(statusOf(makeJio(), new Date('2026-11-03T17:01:00'))).toBe('ended')
  })

  it('shows cancelled even if it was full', () => {
    const jio = makeJio({ participants: ['host', 'a', 'b'], status: 'cancelled' })
    expect(statusOf(jio, NOW)).toBe('cancelled')
  })
})

describe('joining', () => {
  it('adds you to the going list', () => {
    expect(applyJoin(makeJio(), 'a', NOW).participants).toEqual(['host', 'a'])
  })

  it("won't add you twice", () => {
    expect(() => applyJoin(makeJio({ participants: ['host', 'a'] }), 'a', NOW)).toThrow(/already going/)
  })

  it('refuses when the last spot is gone (no overbooking)', () => {
    const full = makeJio({ participants: ['host', 'a', 'b'] })
    expect(() => applyJoin(full, 'c', NOW)).toThrow(/last spot/)
  })

  it('refuses cancelled and ended jios', () => {
    expect(() => applyJoin(makeJio({ status: 'cancelled' }), 'a', NOW)).toThrow(/cancelled/)
    expect(() => applyJoin(makeJio(), 'a', new Date('2026-11-04T10:00:00'))).toThrow(/ended/)
  })
})

describe('choping (queue for a full jio)', () => {
  const full = makeJio({ participants: ['host', 'a', 'b'] })

  it('puts you at the back of the queue', () => {
    const once = { ...full, ...applyChope(full, 'c', NOW) }
    const twice = { ...once, ...applyChope(once, 'd', NOW) }
    expect(twice.waitlist).toEqual(['c', 'd'])
    expect(queuePosition(twice, 'd')).toBe(2)
    expect(myRole(twice, 'd')).toBe('queued')
  })

  it("won't let you chope when there are spots left", () => {
    expect(() => applyChope(makeJio(), 'c', NOW)).toThrow(/join straight away/)
  })

  it("won't queue you twice", () => {
    expect(() => applyChope({ ...full, waitlist: ['c'] }, 'c', NOW)).toThrow(/already in the queue/)
  })

  it('lets you leave the queue', () => {
    expect(applyLeaveQueue({ ...full, waitlist: ['c', 'd'] }, 'c').waitlist).toEqual(['d'])
  })
})

describe('leaving', () => {
  it('frees your spot', () => {
    const jio = makeJio({ participants: ['host', 'a'] })
    expect(applyLeave(jio, 'a').participants).toEqual(['host'])
  })

  it('gives your spot to the first person in the queue', () => {
    const jio = makeJio({ participants: ['host', 'a', 'b'], waitlist: ['c', 'd'] })
    const after = applyLeave(jio, 'a')
    expect(after.participants).toEqual(['host', 'b', 'c'])
    expect(after.waitlist).toEqual(['d'])
  })

  it("doesn't let the host leave (they cancel instead)", () => {
    expect(() => applyLeave(makeJio(), 'host')).toThrow(/Cancel the jio/)
  })
})

describe('who can see and join a jio', () => {
  const friendsOnly = makeJio({ visibility: 'friends', invited: ['friend'] })

  it('shows public jios to everyone', () => {
    expect(canSee(makeJio(), 'stranger')).toBe(true)
  })

  it('shows friends-only jios only to invited friends and the host', () => {
    expect(canSee(friendsOnly, 'friend')).toBe(true)
    expect(isInvited(friendsOnly, 'friend')).toBe(true)
    expect(canSee(friendsOnly, 'host')).toBe(true)
    expect(canSee(friendsOnly, 'stranger')).toBe(false)
  })

  it('always shows a jio to people already in it', () => {
    expect(canSee({ ...friendsOnly, participants: ['host', 'a'] }, 'a')).toBe(true)
  })

  it('lets invited friends join, but not strangers', () => {
    expect(applyJoin(friendsOnly, 'friend', NOW).participants).toEqual(['host', 'friend'])
    expect(() => applyJoin(friendsOnly, 'stranger', NOW)).toThrow(/invited friends only/)
  })
})

describe('fitting in with the Activities page', () => {
  it('turns a jio into an activity like the curated ones', () => {
    const a = toActivity(makeJio({ participants: ['host', 'a'] }), 'host')
    expect(a).toMatchObject({
      id: 'jio-j1',
      jioId: 'j1',
      type: 'openjio',
      source: 'openjio',
      category: 'sports',
      area: 'SMU Sports Hall',
      durationHrs: 2,
      slotsLeft: 1,
      startsAt: TOMORROW.getTime(),
      hostedByMe: true,
    })
  })

  it('fills in the create form from an activity', () => {
    const p = prefillFromActivity({
      title: 'Neon Pottery Jam', category: 'workshops', area: 'Bras Basah', region: 'central', cost: 45, durationHrs: 2,
    })
    expect(p).toMatchObject({ title: 'Neon Pottery Jam', location: 'Bras Basah', cost: 45, durationMins: 120 })
  })
})

describe('the options match firestore.rules', () => {
  // If the categories or regions change, the database must allow the new ones too.
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
  const listAfter = (marker) => {
    const start = rules.indexOf(marker)
    const inside = rules.slice(rules.indexOf('[', start) + 1, rules.indexOf(']', start))
    return inside.split(',').map((x) => x.trim().replace(/'/g, ''))
  }

  it('allows exactly the categories in the questionnaire', () => {
    expect(listAfter('d.category in')).toEqual(INTERESTS.map((i) => i.id))
  })

  it('allows exactly the regions in the form', () => {
    expect(listAfter('d.region in')).toEqual(REGIONS)
  })
})
