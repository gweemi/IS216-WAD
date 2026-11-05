import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import InformationPageView from '@/views/InformationPageView.vue'

async function mountPage(path, page) {
  const informationRoutes = [
    ['privacy', '/privacy'],
    ['terms', '/terms'],
    ['guidelines', '/guidelines'],
    ['about', '/about'],
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'landing', component: { template: '<div>Landing</div>' } },
      ...informationRoutes.map(([name, routePath]) => ({
        path: routePath,
        name,
        component: routePath === path ? InformationPageView : { template: '<div />' },
        meta: { page: name },
      })),
    ],
  })
  await router.push(path)
  await router.isReady()
  return { wrapper: mount(InformationPageView, { global: { plugins: [router] } }), router }
}

describe('InformationPageView', () => {
  it('renders dated policy content, a Back control and the shared footer', async () => {
    const { wrapper, router } = await mountPage('/privacy', 'privacy')

    expect(wrapper.get('h1').text()).toBe('Privacy Policy')
    expect(wrapper.text()).toContain('Last updated: 2 November 2026')
    expect(wrapper.get('.back-link').text()).toContain('Back')
    expect(wrapper.text()).toContain('© 2026 GetOutLah! · G3T7 · IS216 Web Application Development 2, SMU')

    await wrapper.get('.back-link').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('landing'))
  })

  it('renders feature cards for About GETOUTLAH!', async () => {
    const { wrapper } = await mountPage('/about', 'about')

    expect(wrapper.get('h1').text()).toBe('About GETOUTLAH!')
    expect(wrapper.findAll('.feature-card')).toHaveLength(6)
  })
})
