// Checks where the router sends people, depending on whether they're logged in
// and whether they've answered the questionnaire.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MapView from '@/views/MapView.vue'

const fakeAuth = vi.hoisted(() => ({ isLoggedIn: false, hasPreferences: false, isAdmin: false }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ ...fakeAuth, init: async () => {} }),
}))
const Stub = { template: '<div />' }
vi.mock('@/views/AuthView.vue', () => ({ default: Stub }))
vi.mock('@/views/OnboardingView.vue', () => ({ default: Stub }))

const { default: router } = await import('@/router')

async function visit(path) {
  await router.push(path)
  return router.currentRoute.value.name
}

beforeEach(async () => {
  // start every test from the log-in page, logged out
  Object.assign(fakeAuth, { isLoggedIn: false, hasPreferences: false, isAdmin: false })
  await router.replace('/auth')
})

describe('router', () => {
  it('sends logged-out users to log in', async () => {
    for (const path of ['/map', '/activities', '/friends', '/badges', '/profile']) {
      expect(await visit(path)).toBe('auth')
    }
    expect(await visit('/onboarding')).toBe('auth')
  })

  it('sends new users (no answers yet) to the questionnaire', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: false })
    expect(await visit('/map')).toBe('onboarding')
  })

  it('lets users who answered visit every app destination', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    for (const [path, name] of [
      ['/map', 'map'],
      ['/activities', 'activities'],
      ['/friends', 'friends'],
      ['/badges', 'badges'],
      ['/profile', 'profile'],
    ]) {
      expect(await visit(path)).toBe(name)
    }
  })

  it('does not show the questionnaire twice', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/onboarding')).toBe('map')
  })

  it('redirects legacy and unknown routes to map', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/home')).toBe('map')
    expect(await visit('/not-a-page')).toBe('map')
  })

  it('keeps non-admins out of the admin page', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true, isAdmin: false })
    expect(await visit('/admin')).toBe('map')
    expect(await visit('/admin/reports')).toBe('map')
  })

  it('opens the admin page on the activities tab for admins', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true, isAdmin: true })
    expect(await visit('/admin')).toBe('admin-activities')
    expect(await visit('/admin/reports')).toBe('admin-reports')
  })

  it('uses the Leaflet map view for the map route', () => {
    const mapRoute = router.getRoutes().find((route) => route.name === 'map')
    expect(mapRoute.components.default).toBe(MapView)
  })
})
