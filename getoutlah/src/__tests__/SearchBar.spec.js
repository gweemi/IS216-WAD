import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '@/components/common/SearchBar.vue'

describe('SearchBar', () => {
  it('renders its accessible label and placeholder', () => {
    const wrapper = mount(SearchBar, {
      props: { label: 'Search activities', placeholder: 'Search activities, places...' },
    })

    expect(wrapper.get('label').text()).toBe('Search activities')
    expect(wrapper.get('input').attributes('placeholder')).toBe('Search activities, places...')
  })

  it('emits updates and submit events', async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: 'walk' } })

    await wrapper.get('input').setValue('walks')
    await wrapper.setProps({ modelValue: 'walks' })
    await wrapper.get('input').trigger('keydown.enter')

    expect(wrapper.emitted('update:modelValue')).toEqual([['walks']])
    expect(wrapper.emitted('submit')).toEqual([['walks']])
  })
})
