import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimatedBrandHero from '@/components/landing/AnimatedBrandHero.vue'

describe('AnimatedBrandHero', () => {
  it('renders the accessible logo image for each hero variant', () => {
    for (const variant of ['panel', 'full']) {
      const wrapper = mount(AnimatedBrandHero, { props: { variant } })
      const logo = wrapper.get('.logo-image')

      expect(logo.attributes('src')).toBe('/logo.png')
      expect(logo.attributes('alt')).toBe('GETOUTLAH!')
      expect(wrapper.find('.logo-entry').exists()).toBe(true)
      wrapper.unmount()
    }
  })
})
