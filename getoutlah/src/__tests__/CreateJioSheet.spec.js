// Checks the "Start a jio" form fills in starting values and catches mistakes.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { prefillFromActivity } from '@/utils/openjio'

vi.mock('@/services/openjio', () => ({
  createJio: vi.fn(async () => 'new-id'),
  getProfiles: vi.fn(async (ids) => ids.map((uid) => ({ uid, displayName: 'Friend ' + uid, photoURL: null }))),
  friendlyJioError: (e) => e.message,
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { uid: 'me' }, profile: { friendIds: ['jiali', 'siti'] } }),
}))

const { default: CreateJioSheet } = await import('@/components/openjio/CreateJioSheet.vue')

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
    const w = open({ startAt: slot, visibility: 'friends' })
    expect(value(w, 'jio-time')).toBe('14:00')
    expect(w.find('[data-testid="jio-visibility-friends"]').attributes('aria-checked')).toBe('true')
  })

  it('lists your friends to invite for a friends-only jio', async () => {
    const w = open({ visibility: 'friends', invited: ['siti'] })
    await flushPromises()
    const list = w.find('[data-testid="jio-invite-list"]')
    expect(list.text()).toContain('Friend jiali')
    expect(list.text()).toContain('Invite friends (1)')
  })

  it('asks you to invite someone before posting a friends-only jio', async () => {
    const w = open({ title: 'Picnic', category: 'outdoors', location: 'Jurong Lake', visibility: 'friends' })
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
})
