import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNavigation from '@/components/common/AppNavigation.vue'

function makeRouter(path = '/map') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['map', 'activities', 'friends', 'badges', 'profile'].map((name) => ({
      path: `/${name}`,
      name,
      component: { template: '<div />' },
    })),
  })
  return router.push(path).then(() => router.isReady()).then(() => router)
}

describe('AppNavigation', () => {
  it('links to all five app destinations and marks the current route active', async () => {
    const router = await makeRouter('/map')
    const wrapper = mount(AppNavigation, { global: { plugins: [router] } })

    expect(wrapper.get('[data-testid="app-navigation"]').exists()).toBe(true)
    expect(wrapper.findAll('a')).toHaveLength(5)
    expect(wrapper.get('[data-testid="nav-map"]').classes()).toContain('router-link-active')
    expect(wrapper.get('[data-testid="nav-friends"]').attributes('href')).toBe('/friends')
  })
})
