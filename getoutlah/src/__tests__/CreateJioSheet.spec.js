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
})
