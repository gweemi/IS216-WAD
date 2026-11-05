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

// Same card, but clickable through to the activity detail page (as on the Activities page).
function linkedCard(changes = {}) {
  const w = card(changes)
  const push = vi.fn()
  return {
    push,
    w: mount(JioCard, {
      props: { ...w.props(), linkToDetails: true },
      global: { mocks: { $router: { push } }, stubs: { RouterLink: { props: ['to'], template: '<a :href="to.name"><slot /></a>' } } },
    }),
  }
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

  it('only lets the host edit an active OpenJio', () => {
    expect(card({}, 'host').find('[data-testid="edit-jio"]').exists()).toBe(true)
    expect(card({ status: 'cancelled' }, 'host').find('[data-testid="edit-jio"]').exists()).toBe(false)
    expect(card({}, 'me').find('[data-testid="edit-jio"]').exists()).toBe(false)
  })

  it('lets the host and people going open the attendee list, but not others', () => {
    expect(card({}, 'host').find('[data-testid="view-jio-attendees"]').exists()).toBe(true)
    expect(card({ participants: ['host', 'me'] }, 'me').find('[data-testid="view-jio-attendees"]').exists()).toBe(true)
    expect(card({ participants: ['host', 'x', 'y'], waitlist: ['me'], capacity: 3 }, 'me').find('[data-testid="view-jio-attendees"]').exists()).toBe(false)
    expect(card({}, 'me').find('[data-testid="view-jio-attendees"]').exists()).toBe(false)
  })

  it('shows Who\'s going on a clickable card for someone going', () => {
    const { w } = linkedCard({ participants: ['host', 'me'] })
    expect(w.find('[data-testid="view-jio-attendees"]').exists()).toBe(true)
    expect(button(w).exists()).toBe(false)
  })

  it('shows who invited you to an invite-only jio', () => {
    const w = card({ visibility: 'invite_only', invited: ['me'] })
    expect(w.find('[data-testid="jio-invited"]').text()).toContain('Micah invited you')
    expect(button(w).text()).toBe('Join')
  })

  it('lets a pending invite-only recipient decline without adding a second response step', async () => {
    const w = card({ visibility: 'invite_only', invited: ['me'] })
    expect(button(w).text()).toBe('Join')
    expect(w.find('[data-testid="decline-jio"]').exists()).toBe(true)
    await w.get('[data-testid="decline-jio"]').trigger('click')
    await flushPromises()
    expect(calls).toContainEqual(['decline', 'j1'])
  })

  it('also allows a pending legacy invite-only recipient to decline', () => {
    const w = card({ visibility: 'friends', invited: ['me'] })
    expect(w.find('[data-testid="decline-jio"]').exists()).toBe(true)
  })

  it('labels legacy invite-only jios without changing their meaning', () => {
    const badge = (w) => w.find('[data-testid="jio-visibility"]').text()
    expect(badge(card({}))).toBe('Public')
    expect(badge(card({ visibility: 'friends', invited: ['me'] }))).toBe('Legacy invite only')
  })

  it('shows no button on a cancelled jio', () => {
    const w = card({ status: 'cancelled' })
    expect(button(w).exists()).toBe(false)
    expect(w.text()).toContain('Cancelled')
  })

  it('opens the activity detail page when the card is clicked', async () => {
    const { w, push } = linkedCard()
    expect(w.text()).not.toContain('View details')
    expect(button(w).exists()).toBe(false) // join / leave live on the detail page instead
    await w.find('.jio-desc, .jio-meta').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'activity', params: { id: 'jio-j1' } })
  })

  it("doesn't open the detail page when one of the card's buttons is clicked", async () => {
    const { w, push } = linkedCard({ visibility: 'invite_only', invited: ['me'] })
    await w.find('[data-testid="decline-jio"]').trigger('click')
    await flushPromises()
    expect(calls).toEqual([['decline', 'j1']])
    expect(push).not.toHaveBeenCalled()
  })

  it("keeps the host's Who's going button, but leaves Edit and Cancel to the detail page", () => {
    const { w } = linkedCard({ hostId: 'me', participants: ['me'] })
    expect(w.find('[data-testid="view-jio-attendees"]').exists()).toBe(true)
    expect(w.find('[data-testid="edit-jio"]').exists()).toBe(false)
    expect(button(w).exists()).toBe(false)
  })

  it('is not clickable unless asked to be', async () => {
    const w = card({})
    expect(w.find('[data-testid="jio-card"]').classes()).not.toContain('is-clickable')
    expect(w.find('[data-testid="jio-details-link"]').exists()).toBe(false)
  })
})
