// Checks the questionnaire page has a way out (log out) for the wrong account.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const calls = vi.hoisted(() => ({ logOut: 0, routes: [] }))

vi.mock('@/services/auth', () => ({
  logOut: vi.fn(async () => {
    calls.logOut += 1
  }),
}))
vi.mock('@/services/preferences', () => ({ savePreferences: vi.fn() }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    email: 'enmin.seah.2025@smu.edu.sg',
    profile: { displayName: 'En Min Seah' },
    user: null,
  }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: (to) => calls.routes.push(to) }),
}))

const { default: OnboardingView } = await import('@/views/OnboardingView.vue')

describe('OnboardingView', () => {
  it('greets the user, uses the logo image, and shows which account they are using', () => {
    const wrapper = mount(OnboardingView)
    expect(wrapper.find('[data-testid="onboarding-welcome"]').text()).toContain(
      'Welcome, En Min Seah!',
    )
    expect(wrapper.find('[data-testid="onboarding-welcome"] br').exists()).toBe(true)
    expect(wrapper.find('.onboarding-logo').attributes('src')).toBe('/logo.png')
    expect(wrapper.text()).toContain('Signing in as enmin.seah.2025@smu.edu.sg.')
    expect(wrapper.text()).not.toContain('3 quick questions, under a minute.')
    expect(wrapper.text()).not.toContain('Your next adventure starts here')
  })

  it('confirms before logging out and going back to the log-in page', async () => {
    const wrapper = mount(OnboardingView, { global: { stubs: { Teleport: true } } })
    await wrapper.find('[data-testid="onboarding-logout"]').trigger('click')

    expect(calls.logOut).toBe(0)
    expect(wrapper.get('[role="dialog"]').text()).toContain('Are you sure you want to log out?')
    await wrapper.get('[data-testid="logout-confirm"]').trigger('click')
    await flushPromises()
    expect(calls.logOut).toBe(1)
    expect(calls.routes).toContainEqual({ name: 'login' })
  })
})
