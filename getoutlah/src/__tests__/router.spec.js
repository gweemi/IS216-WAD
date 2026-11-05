// Checks where the router sends people, depending on whether they're logged in
// and whether they've answered the questionnaire.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MapView from '@/views/MapView.vue'

const fakeAuth = vi.hoisted(() => ({ isLoggedIn: false, hasPreferences: false, isAdmin: false }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ ...fakeAuth, init: async () => {} }),
}))
const Stub = { template: '<div />' }
vi.mock('@/views/LandingView.vue', () => ({ default: Stub }))
vi.mock('@/views/LoginView.vue', () => ({ default: Stub }))
vi.mock('@/views/InformationPageView.vue', () => ({ default: Stub }))
vi.mock('@/views/OnboardingView.vue', () => ({ default: Stub }))

const { default: router } = await import('@/router')

async function visit(path) {
  await router.push(path)
  return router.currentRoute.value.name
}

beforeEach(async () => {
  // start every test from the landing page, logged out
  Object.assign(fakeAuth, { isLoggedIn: false, hasPreferences: false, isAdmin: false })
  await router.replace('/')
})

describe('router', () => {
  it('sends logged-out users to log in', async () => {
    for (const path of ['/map', '/activities', '/friends', '/badges', '/profile']) {
      expect(await visit(path)).toBe('login')
    }
    expect(await visit('/onboarding')).toBe('login')
  })

  it('shows the landing page and redirects the legacy auth route to login', async () => {
    expect(await visit('/')).toBe('landing')
    expect(await visit('/auth')).toBe('login')
    expect(await visit('/login')).toBe('login')
  })

  it('opens legal and About Us pages for signed-out and signed-in visitors', async () => {
    const publicRoutes = [
      ['/privacy', 'privacy'], ['/terms', 'terms'], ['/guidelines', 'guidelines'], ['/about', 'about'],
    ]
    for (const [path, name] of publicRoutes) expect(await visit(path)).toBe(name)

    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    for (const [path, name] of publicRoutes) expect(await visit(path)).toBe(name)
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
      ['/activities/openjio', 'activities'],
      ['/activities/openjio/create', 'activities'],
      ['/activities/openjio/example/edit', 'openjio-edit'],
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

  it('keeps logged-in users out of public landing and login pages', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/login')).toBe('map')
    expect(await visit('/')).toBe('map')
  })

  it('redirects legacy and unknown routes to map', async () => {
    Object.assign(fakeAuth, { isLoggedIn: true, hasPreferences: true })
    expect(await visit('/home')).toBe('map')
    expect(await visit('/not-a-page')).toBe('map')
    expect(await visit('/data-policy')).toBe('map')
    expect(await visit('/cookie-policy')).toBe('map')
    expect(await visit('/about-us')).toBe('map')
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
