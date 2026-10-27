import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterButton from '@/components/common/FilterButton.vue'

describe('FilterButton', () => {
  it('renders its label and custom icon', async () => {
    const wrapper = mount(FilterButton, { props: { label: 'Filter activities', icon: 'bi-funnel' } })

    expect(wrapper.get('button').attributes('aria-label')).toBe('Filter activities')
    expect(wrapper.get('i').classes()).toContain('bi-funnel')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
