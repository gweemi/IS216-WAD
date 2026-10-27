import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ActivityMapMarker from '@/components/map/ActivityMapMarker.vue'

describe('ActivityMapMarker', () => {
  it('uses the configured category colour and Bootstrap Icon', () => {
    const wrapper = mount(ActivityMapMarker, {
      props: { activity: { title: 'Pottery jam OPENJIO', category: 'workshops' } },
    })

    expect(wrapper.classes()).toContain('gol-activity-marker')
    expect(wrapper.find('i').classes()).toContain('bi-paintbrush')
    expect(wrapper.attributes('style')).toContain('--activity-color: #FFC976')
    expect(wrapper.text()).toBe('Pottery jam')
  })

  it('uses the fallback presentation for unknown categories', () => {
    const wrapper = mount(ActivityMapMarker, {
      props: { activity: { title: 'Surprise event', category: 'unknown' } },
    })

    expect(wrapper.find('i').classes()).toContain('bi-compass')
    expect(wrapper.attributes('style')).toContain('--activity-color: #9A8CA6')
  })
})
