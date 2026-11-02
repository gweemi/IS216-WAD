import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { INTERESTS } from '@/config/preferences'
import LandingCategoryChip from '@/components/landing/LandingCategoryChip.vue'

describe('LandingCategoryChip', () => {
  it('renders every canonical label, emoji, and colour without redefining category metadata', () => {
    for (const [index, category] of INTERESTS.entries()) {
      const wrapper = mount(LandingCategoryChip, { props: { category, index } })
      expect(wrapper.text()).toContain(category.emoji)
      expect(wrapper.text()).toContain(category.label)
      const hex = category.color.slice(1)
      const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).join(', ')
      expect(wrapper.find('.tile').attributes('style')).toContain(`rgb(${rgb})`)
    }
  })
})
