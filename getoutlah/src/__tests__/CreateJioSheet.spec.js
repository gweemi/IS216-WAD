// Checks the "Start a jio" form fills in starting values and catches mistakes.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { prefillFromActivity } from '@/utils/openjio'

vi.mock('@/services/openjio', () => ({
  createJio: vi.fn(async () => 'new-id'),
  updateJio: vi.fn(async (id) => id),
  friendlyJioError: (e) => e.message,
}))
vi.mock('@/utils/celebrate.js', () => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn() }))
const badgePopup = vi.hoisted(() => ({ showNewBadges: vi.fn(async () => {}) }))
vi.mock('@/components/badges/NewBadgePopup.vue', () => badgePopup)
vi.mock('@/services/api/onemap', () => ({
  searchPlaces: vi.fn(async () => [
    { name: 'Tampines Hub', address: '1 Tampines Walk Singapore 528523', lat: 1.3532, lng: 103.9405 },
  ]),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { uid: 'me' }, profile: {} }) }))

// Two accepted friends in the Friends feature's store
const { friendsState } = await import('@/stores/friends')
Object.assign(friendsState, {
  uid: 'me',
  ready: true,
  friendships: ['jiali', 'siti'].map((uid) => ({
    id: uid,
    members: ['me', uid],
    status: 'accepted',
    names: { [uid]: 'Friend ' + uid },
  })),
})

const { default: CreateJioSheet } = await import('@/components/openjio/CreateJioSheet.vue')
const { createJio, updateJio } = await import('@/services/openjio')

setActivePinia(createPinia())

function open(prefill = null) {
  return mount(CreateJioSheet, {
    props: { open: true, prefill },
    global: { stubs: { teleport: true } },
  })
}

const value = (w, id) => w.find(`[data-testid="${id}"]`).element.value

describe('CreateJioSheet', () => {
  it('starts empty, tomorrow at 3pm', () => {
    const w = open()
    expect(value(w, 'jio-title')).toBe('')
    expect(value(w, 'jio-time')).toBe('15:00')
  })

  it('fills in values from an activity', () => {
    const w = open(
      prefillFromActivity({ title: 'Pottery jam', category: 'workshops', area: 'Bras Basah', cost: 18, region: 'central' }),
    )
    expect(value(w, 'jio-title')).toBe('Pottery jam')
    expect(value(w, 'jio-category')).toBe('workshops')
    expect(value(w, 'jio-location')).toBe('Bras Basah')
    expect(value(w, 'jio-cost')).toBe('18')
  })

  it('fills in a free time slot as a friends-only jio', () => {
    const slot = new Date(Date.now() + 2 * 86400000)
    slot.setHours(14, 0, 0, 0)
    const w = open({ startAt: slot, visibility: 'invite_only' })
    expect(value(w, 'jio-time')).toBe('14:00')
    expect(w.find('[data-testid="jio-visibility-invite_only"]').attributes('aria-checked')).toBe('true')
  })

  it('lists your friends to invite for a friends-only jio', async () => {
    const w = open({ visibility: 'invite_only', invited: ['siti'] })
    await flushPromises()
    const list = w.find('[data-testid="jio-invite-list"]')
    expect(list.text()).toContain('Friend jiali')
    expect(list.text()).toContain('Invite friends (1)')
  })

  it('asks you to invite someone before posting a friends-only jio', async () => {
    const w = open({ title: 'Picnic', category: 'outdoors', location: 'Jurong Lake', visibility: 'invite_only' })
    await flushPromises()
    await w.find('form').trigger('submit')
    expect(w.find('[data-testid="create-jio-error"]').text()).toBe('Invite at least one friend.')
  })

  it('ignores a category the form does not know', () => {
    expect(value(open({ category: 'skydiving' }), 'jio-category')).toBe('')
  })

  it('shows the first problem instead of saving', async () => {
    const w = open()
    await w.find('form').trigger('submit')
    expect(w.find('[data-testid="create-jio-error"]').text()).toBe('Give your jio a name.')
    expect(w.emitted('created')).toBeUndefined()
  })

  it('requires confirmation before posting a valid OpenJio', async () => {
    const start = new Date(Date.now() + 2 * 86400000)
    start.setHours(15, 0, 0, 0)
    const w = open({ title: 'Picnic', category: 'outdoors', location: 'Jurong Lake', startAt: start })

    await w.find('form').trigger('submit')
    expect(w.get('[data-testid="jio-confirmation"]').text()).toContain('Post this OPENJIO?')
    expect(createJio).not.toHaveBeenCalled()

    await w.get('[data-testid="jio-confirm-submit"]').trigger('click')
    await flushPromises()
    expect(createJio).toHaveBeenCalledTimes(1)
    expect(w.emitted('created')?.[0]).toEqual(['new-id'])
    // Posting a jio earns Big host energy straight away, shown in the badge pop-up
    expect(badgePopup.showNewBadges.mock.calls.at(-1)[0].map((b) => b.id)).toEqual(['big-host-energy'])
  })

  it('pre-fills a host OpenJio and confirms before saving edits', async () => {
    const start = new Date(Date.now() + 2 * 86400000)
    start.setHours(15, 0, 0, 0)
    const editJio = {
      id: 'jio-1', title: 'Original walk', category: 'outdoors', location: 'MacRitchie', region: 'central',
      startAt: start, durationMins: 120, cost: 0, capacity: 4, visibility: 'public', invited: [],
      participants: ['host', 'friend'], description: 'Bring water.', lat: 1.34, lng: 103.82,
    }
    const w = mount(CreateJioSheet, { props: { open: true, editJio }, global: { stubs: { teleport: true } } })

    expect(value(w, 'jio-title')).toBe('Original walk')
    await w.find('form').trigger('submit')
    expect(w.get('[data-testid="jio-confirmation"]').text()).toContain('Save these changes?')
    expect(updateJio).not.toHaveBeenCalled()

    await w.get('[data-testid="jio-confirm-submit"]').trigger('click')
    await flushPromises()
    expect(updateJio).toHaveBeenCalledWith('jio-1', expect.objectContaining({ title: 'Original walk', capacity: 4 }))
    expect(w.emitted('updated')?.[0]).toEqual(['jio-1'])
  })

  it('does not let an edit reduce capacity below people already going', async () => {
    const start = new Date(Date.now() + 2 * 86400000)
    const w = mount(CreateJioSheet, {
      props: { open: true, editJio: { id: 'jio-1', title: 'Walk', category: 'outdoors', location: 'MacRitchie', region: 'central', startAt: start, durationMins: 60, cost: 0, capacity: 3, visibility: 'public', invited: [], participants: ['host', 'a', 'b'] } },
      global: { stubs: { teleport: true } },
    })
    await w.find('[data-testid="jio-capacity"]').setValue(2)
    await w.find('form').trigger('submit')
    expect(w.find('[data-testid="create-jio-error"]').text()).toContain('cannot be lower than the 3 people')
    expect(w.find('[data-testid="jio-confirmation"]').exists()).toBe(false)
  })

  it('has the same location fields as the admin form: search, area name, latitude, longitude', async () => {
    const w = open()
    await w.find('[data-testid="jio-place"]').setValue('528523')
    await w.find('[data-testid="jio-find-place"]').trigger('click')
    await flushPromises()
    await w.find('[data-testid="jio-places"] button').trigger('click')

    expect(value(w, 'jio-place')).toBe('1 Tampines Walk Singapore 528523')
    expect(value(w, 'jio-location')).toBe('Tampines Hub') // area name filled in because it was empty
    expect(value(w, 'jio-lat')).toBe('1.3532')
    expect(value(w, 'jio-lng')).toBe('103.9405')
    expect(value(w, 'jio-region')).toBe('east')
  })

  it('keeps an area name the user already typed when picking a place', async () => {
    const w = open()
    await w.find('[data-testid="jio-location"]').setValue('Level 3 courts')
    await w.find('[data-testid="jio-place"]').setValue('Tampines Hub')
    await w.find('[data-testid="jio-find-place"]').trigger('click')
    await flushPromises()
    await w.find('[data-testid="jio-places"] button').trigger('click')
    expect(value(w, 'jio-location')).toBe('Level 3 courts')
    expect(value(w, 'jio-lat')).toBe('1.3532')
  })

  it('rejects typed coordinates outside Singapore', async () => {
    const w = open({ title: 'Picnic', category: 'outdoors', location: 'Somewhere' })
    await w.find('[data-testid="jio-lat"]').setValue('40.7')
    await w.find('[data-testid="jio-lng"]').setValue('-74')
    await w.find('form').trigger('submit')
    expect(w.find('[data-testid="create-jio-error"]').text()).toContain('Pick a location in Singapore')
  })

  it('keeps the exact spot when starting a jio from an activity', () => {
    const w = open(prefillFromActivity({ title: 'Hike', category: 'outdoors', area: 'MacRitchie', lat: 1.34, lng: 103.83 }))
    expect(value(w, 'jio-lat')).toBe('1.34')
    expect(value(w, 'jio-lng')).toBe('103.83')
  })

  it('lets the host enter a whole-group price and saves the per-person price', async () => {
    createJio.mockClear()
    const w = open({ title: 'Escape room', category: 'games', location: 'Tampines' })
    await w.find('[data-testid="jio-capacity"]').setValue(4)
    await w.find('[data-testid="jio-price-group"]').trigger('click')
    expect(w.find('[data-testid="jio-price-group"]').attributes('aria-checked')).toBe('true')
    await w.find('[data-testid="jio-group-cost"]').setValue(100)
    expect(w.find('[data-testid="jio-price-split"]').text()).toContain('$25 per person')

    await w.find('form').trigger('submit')
    expect(w.find('[data-testid="jio-confirmation"]').text()).toContain('$25 per person')
    await w.get('[data-testid="jio-confirm-submit"]').trigger('click')
    await flushPromises()
    expect(createJio).toHaveBeenCalledWith(expect.objectContaining({ cost: 25, capacity: 4 }))
  })

  it('rounds an uneven group split to the cent', async () => {
    const w = open()
    await w.find('[data-testid="jio-capacity"]').setValue(3)
    await w.find('[data-testid="jio-price-group"]').trigger('click')
    await w.find('[data-testid="jio-group-cost"]').setValue(100)
    expect(w.find('[data-testid="jio-price-split"]').text()).toContain('$33.33 per person')
  })

  it('keeps the same overall price when switching between per person and whole group', async () => {
    const w = open({ cost: 10 })
    await w.find('[data-testid="jio-capacity"]').setValue(5)
    await w.find('[data-testid="jio-price-group"]').trigger('click')
    expect(value(w, 'jio-group-cost')).toBe('50')
    await w.find('[data-testid="jio-price-solo"]').trigger('click')
    expect(value(w, 'jio-cost')).toBe('10')
  })
})
