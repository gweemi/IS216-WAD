// Checks where the router sends people, depending on whether they're logged in
// and whether they've answered the questionnaire.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fakeAuth = vi.hoisted(() => ({ isLoggedIn: false, hasPreferences: false }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ ...fakeAuth, init: async () => {} }),
}))
const Stub = { template: '<div />' }
vi.mock('@/views/AuthView.vue', () => ({ default: Stub }))
vi.mock('@/views/HomeView.vue', () => ({ default: Stub }))
vi.mock('@/views/OnboardingView.vue', () => ({ default: Stub }))

const { default: router } = await import('@/router')

async function visit(path) {
  await router.push(path)
  return router.currentRoute.value.name
}

beforeEach(async () => {
  // start every test from the log-in page, logged out
  Object.assign(fakeAuth, { isLoggedIn: false, hasPreferences: false })
  await router.replace('/auth')
})

describe('router', () => {
  it('sends logged-out users to log in', async () => {
    expect(await visit('/home')).toBe('auth')
    expect(await visit('/onboarding')).toBe('auth')
  })

  it('sends new users (no answers yet) to the questionnaire', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: false })
    expect(await visit('/home')).toBe('onboarding')
  })

  it('lets users who answered go to home', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/home')).toBe('home')
  })

  it('does not show the questionnaire twice', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/onboarding')).toBe('home')
  })
})
