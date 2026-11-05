import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const auth = { profile: {} }
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/components/openjio/CreateJioSheet.vue', () => ({
  default: { name: 'CreateJioSheet', props: ['open'], emits: ['close', 'created'], template: '<div data-testid="sheet" :data-open="open" />' },
}))

const { default: StartJioCard } = await import('@/components/openjio/StartJioCard.vue')

describe('StartJioCard', () => {
  it('says Start a jio and opens the create form when clicked', async () => {
    auth.profile = {}
    const w = mount(StartJioCard)
    expect(w.text()).toContain('Start a jio')
    expect(w.get('[data-testid="sheet"]').attributes('data-open')).toBe('false')
    await w.get('[data-testid="start-jio-card"]').trigger('click')
    expect(w.get('[data-testid="sheet"]').attributes('data-open')).toBe('true')
  })

  it('closes the form and passes on the new jio id once created', async () => {
    auth.profile = {}
    const w = mount(StartJioCard)
    await w.get('[data-testid="start-jio-card"]').trigger('click')
    w.getComponent({ name: 'CreateJioSheet' }).vm.$emit('created', 'new-id')
    await w.vm.$nextTick()
    expect(w.emitted('created')).toEqual([['new-id']])
    expect(w.get('[data-testid="sheet"]').attributes('data-open')).toBe('false')
  })

  it('is disabled with the reason for banned users', () => {
    auth.profile = { banned: true }
    const w = mount(StartJioCard)
    expect(w.get('[data-testid="start-jio-card"]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('You are banned from starting OPENJIOs.')
    expect(w.find('[data-testid="sheet"]').exists()).toBe(false)
  })
})
