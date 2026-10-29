// Checks that each OPENJIO card shows the right details and button for the user.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const calls = vi.hoisted(() => [])
const user = vi.hoisted(() => ({ uid: 'me' }))
vi.mock('@/services/openjio', () => ({
  watchJios: vi.fn(),
  runJioAction: vi.fn(async (action, id) => {
    calls.push([action, id])
    return "You're in! See you there."
  }),
  friendlyJioError: (e) => e.message,
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user, profile: {} }) }))

const { default: JioCard } = await import('@/components/openjio/JioCard.vue')

const later = new Date(Date.now() + 2 * 86400000)

function card(changes, uid = 'me') {
  user.uid = uid
  const jio = {
    id: 'j1',
    title: 'Pickup basketball',
    category: 'sports',
    location: 'Clementi',
    region: 'west',
    startAt: later,
    durationMins: 90,
    cost: 0,
    capacity: 3,
    visibility: 'public',
    hostId: 'host',
    hostName: 'Micah',
    participants: ['host'],
    waitlist: [],
    invited: [],
    status: 'open',
    ...changes,
  }
  return mount(JioCard, { props: { jio, uid } })
}

const button = (w) => w.find('[data-testid="jio-action"]')

beforeEach(() => {
  setActivePinia(createPinia())
  calls.length = 0
})

describe('JioCard', () => {
  it('shows Join when there are spots left, and joins when tapped', async () => {
    const w = card({})
    expect(button(w).text()).toBe('Join')
    expect(w.find('[data-testid="jio-status"]').text()).toBe('Open · 2 spots left')
    await button(w).trigger('click')
    await flushPromises()
    expect(calls).toEqual([['join', 'j1']])
    expect(w.find('[data-testid="jio-message"]').text()).toContain("You're in")
  })

  it('shows Chope next spot when full', () => {
    expect(button(card({ participants: ['host', 'a', 'b'] })).text()).toBe('Chope next spot')
  })

  it('shows your place in the queue', () => {
    const w = card({ participants: ['host', 'a', 'b'], waitlist: ['x', 'me'] })
    expect(w.find('[data-testid="queue-position"]').text()).toContain('#2 in line')
    expect(button(w).text()).toBe('Leave queue')
  })

  it('shows Leave when you are going, and Cancel jio to the host', () => {
    expect(button(card({ participants: ['host', 'me'] })).text()).toBe('Leave')
    expect(button(card({}, 'host')).text()).toBe('Cancel jio')
  })

  it('shows who invited you to a friends-only jio', () => {
    const w = card({ visibility: 'friends', invited: ['me'] })
    expect(w.find('[data-testid="jio-invited"]').text()).toContain('Micah invited you')
    expect(button(w).text()).toBe('Join')
  })

  it('shows no button on a cancelled jio', () => {
    const w = card({ status: 'cancelled' })
    expect(button(w).exists()).toBe(false)
    expect(w.text()).toContain('Cancelled')
  })
})
