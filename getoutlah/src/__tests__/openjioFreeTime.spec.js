// Checks the OpenJio buttons on the Friends page: shared free times become a friends-only jio.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { prefillFromWindow, commonFreeTimes, validateJio } from '@/utils/openjio'

vi.mock('@/services/openjio', () => ({ createJio: vi.fn(), friendlyJioError: (e) => e.message }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { uid: 'me' }, profile: {} }) }))

const HOUR = 3600000
const NOW = new Date('2026-11-02T10:00:00').getTime()
const at = (h) => NOW + h * HOUR

describe('prefillFromWindow', () => {
  it('makes a friends-only jio at that time with those friends invited', () => {
    const p = prefillFromWindow({ start: at(4), end: at(7) }, ['jiali', 'siti', 'jiali'], NOW)
    expect(p.startAt.getTime()).toBe(at(4))
    expect(p.durationMins).toBe(180)
    expect(p.visibility).toBe('friends')
    expect(p.invited).toEqual(['jiali', 'siti'])
  })

  it('starts at the next quarter hour if the free time has already begun', () => {
    const p = prefillFromWindow({ start: at(-1), end: at(2) }, ['jiali'], NOW + 7 * 60000)
    expect(p.startAt.getTime()).toBe(NOW + 15 * 60000)
    expect(p.durationMins).toBe(105)
  })

  it('gives a start time and length the form accepts', () => {
    const p = prefillFromWindow({ start: at(4), end: at(20) }, ['jiali'], NOW)
    const form = { ...p, title: 'Supper', category: 'food', location: 'Maxwell', region: 'central', cost: 0, capacity: 4 }
    expect(validateJio(form, new Date(NOW))).toEqual([])
    expect(p.durationMins).toBe(720) // capped at 12 hours
  })
})

describe('commonFreeTimes', () => {
  it('groups friends who are free at the same time, soonest first', () => {
    const times = commonFreeTimes([
      { uid: 'a', name: 'Jia Li', freeTogether: [{ start: at(5), end: at(8) }] },
      { uid: 'b', name: 'Siti', freeTogether: [{ start: at(5), end: at(8) }, { start: at(2), end: at(3) }] },
      { uid: 'c', name: 'Ravi', freeTogether: [] },
    ])
    expect(times.map((t) => t.friends.map((f) => f.uid))).toEqual([['b'], ['a', 'b']])
  })
})

describe('FreeTogetherJios', () => {
  it('shows an OpenJio button for each time you share with friends', async () => {
    const { friendsState } = await import('@/stores/friends')
    const soon = Date.now() + 2 * 86400000
    Object.assign(friendsState, {
      uid: 'me',
      ready: true,
      myFreeWindows: [{ start: soon, end: soon + 3 * HOUR }],
      friendships: [{ id: 'f', members: ['me', 'jiali'], status: 'accepted', names: { jiali: 'Jia Li' } }],
      profiles: { jiali: { displayName: 'Jia Li', freeWindows: [{ start: soon, end: soon + 3 * HOUR }] } },
    })
    setActivePinia(createPinia())
    const { default: FreeTogetherJios } = await import('@/components/openjio/FreeTogetherJios.vue')
    const w = mount(FreeTogetherJios, { global: { stubs: { teleport: true, RouterLink: true } } })
    const slots = w.findAll('[data-testid="free-together-slot"]')
    expect(slots).toHaveLength(1)
    expect(slots[0].text()).toContain('with Jia')
    expect(slots[0].find('[data-testid="start-jio-button"]').text()).toContain('OpenJio')
  })
})
