import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ActivityMapMarker from '@/components/map/ActivityMapMarker.vue'

describe('ActivityMapMarker', () => {
  it('uses the configured category colour and canonical emoji', () => {
    const wrapper = mount(ActivityMapMarker, {
      props: { activity: { title: 'Pottery jam OPENJIO', category: 'workshops' } },
    })

    expect(wrapper.classes()).toContain('gol-activity-marker')
    expect(wrapper.get('.gol-activity-marker__emoji').text()).toBe('🏺')
    expect(wrapper.attributes('style')).toContain('--activity-color: #FFC976')
    expect(wrapper.text()).toBe('🏺')
  })

  it('uses the fallback presentation for unknown categories', () => {
    const wrapper = mount(ActivityMapMarker, {
      props: { activity: { title: 'Surprise event', category: 'unknown' } },
    })

    expect(wrapper.get('.gol-activity-marker__emoji').text()).toBe('✨')
    expect(wrapper.attributes('style')).toContain('--activity-color: #9A8CA6')
  })
})
