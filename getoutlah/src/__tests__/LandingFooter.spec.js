import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import LandingFooter from '@/components/landing/LandingFooter.vue'

window.scrollTo = vi.fn()

async function mountFooter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/privacy', name: 'privacy', component: { template: '<div />' } },
      { path: '/terms', name: 'terms', component: { template: '<div />' } },
      { path: '/guidelines', name: 'guidelines', component: { template: '<div />' } },
      { path: '/about', name: 'about', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'privacy' })
  await router.isReady()
  return { wrapper: mount(LandingFooter, { global: { plugins: [router] } }), router }
}

describe('LandingFooter', () => {
  it('shows the agreed project credit and links to every public page', async () => {
    const { wrapper } = await mountFooter()

    expect(wrapper.text()).toContain('© 2026 GetOutLah! · G3T7 · IS216 Web Application Development, SMU')
    expect(wrapper.findAll('a').map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Privacy Policy', '/privacy'],
      ['Terms of Use', '/terms'],
      ['Community Guidelines', '/guidelines'],
      ['About Us', '/about'],
    ])
  })

  it('returns to the top when a footer link is clicked', async () => {
    const { wrapper } = await mountFooter()

    await wrapper.get('a[href="/terms"]').trigger('click')

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

})
