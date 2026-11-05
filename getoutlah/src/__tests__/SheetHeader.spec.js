import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SheetHeader from '@/components/common/SheetHeader.vue'

describe('SheetHeader', () => {
  it('renders its optional eyebrow, title, and custom close label', () => {
    const wrapper = mount(SheetHeader, {
      props: {
        eyebrow: 'Make it yours',
        title: 'Edit profile',
        closeLabel: 'Close profile editor',
      },
    })

    expect(wrapper.get('.gol-eyebrow').text()).toBe('Make it yours')
    expect(wrapper.get('.gol-title').text()).toBe('Edit profile')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Close profile editor')
  })

  it('omits an absent eyebrow and emits close', async () => {
    const wrapper = mount(SheetHeader, { props: { title: 'Tune your vibe' } })

    expect(wrapper.find('.gol-eyebrow').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Close')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
