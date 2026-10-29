import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/firebase', () => ({ isFirebaseConfigured: true }))

const { default: App } = await import('@/App.vue')

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth', component: { template: '<div>Auth</div>' } },
      { path: '/onboarding', component: { template: '<div>Onboarding</div>' }, meta: { requiresLogin: true } },
      {
        path: '/map', name: 'map', component: { template: '<div>Map</div>' },
        meta: { requiresLogin: true, appNavigation: true, mapLayout: true },
      },
      { path: '/activities', name: 'activities', component: { template: '<div>Activities</div>' } },
      { path: '/friends', name: 'friends', component: { template: '<div>Friends</div>' } },
      {
        path: '/badges', name: 'badges', component: { template: '<div>Badges</div>' },
        meta: { requiresLogin: true, appNavigation: true },
      },
      { path: '/profile', name: 'profile', component: { template: '<div>Profile</div>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

describe('App shell', () => {
  it('hides navigation during authentication and onboarding', async () => {
    expect((await mountAt('/auth')).find('[data-testid="app-navigation"]').exists()).toBe(false)
    expect((await mountAt('/onboarding')).find('[data-testid="app-navigation"]').exists()).toBe(false)
  })

  it('shows navigation on completed app routes', async () => {
    const wrapper = await mountAt('/map')

    expect(wrapper.find('[data-testid="app-navigation"]').exists()).toBe(true)
    expect(wrapper.get('.app-content').classes()).toContain('app-content--map-layout')
  })

  it('shows navigation on the badges route', async () => {
    const wrapper = await mountAt('/badges')

    expect(wrapper.find('[data-testid="app-navigation"]').exists()).toBe(true)
  })
})
