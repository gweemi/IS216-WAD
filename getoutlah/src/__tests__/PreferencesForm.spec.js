// Clicks through the questionnaire like a user would.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PreferencesForm from '@/components/PreferencesForm.vue'

const byId = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`)

describe('PreferencesForm', () => {
  it('walks through all 3 steps and submits the answers', async () => {
    const wrapper = mount(PreferencesForm)

    // Step 1: interests
    expect(byId(wrapper, 'prefs-step').text()).toBe('Step 1 of 3')
    expect(byId(wrapper, 'prefs-next').attributes('disabled')).toBeDefined() // nothing picked yet
    await byId(wrapper, 'interest-outdoors').trigger('click')
    await byId(wrapper, 'interest-food').trigger('click')
    expect(byId(wrapper, 'interest-food').attributes('aria-pressed')).toBe('true')
    await byId(wrapper, 'prefs-next').trigger('click')

    // Step 2: budget
    expect(byId(wrapper, 'prefs-step').text()).toBe('Step 2 of 3')
    expect(byId(wrapper, 'prefs-next').attributes('disabled')).toBeDefined()
    await byId(wrapper, 'budget-under20').trigger('click')
    await byId(wrapper, 'prefs-next').trigger('click')

    // Step 3: energy + group
    expect(byId(wrapper, 'prefs-step').text()).toBe('Step 3 of 3')
    await byId(wrapper, 'energy-high').trigger('click')
    expect(byId(wrapper, 'prefs-next').attributes('disabled')).toBeDefined() // group still missing
    await byId(wrapper, 'group-group').trigger('click')
    await byId(wrapper, 'prefs-next').trigger('click')

    expect(wrapper.emitted('submit')[0][0]).toEqual({
      interests: ['outdoors', 'food'],
      maxBudget: 20,
      energyLevel: 'high',
      groupPreference: 'group',
    })
  })

  it('lets you unselect an interest', async () => {
    const wrapper = mount(PreferencesForm)
    await byId(wrapper, 'interest-arts').trigger('click')
    await byId(wrapper, 'interest-arts').trigger('click')
    expect(byId(wrapper, 'interest-arts').attributes('aria-pressed')).toBe('false')
    expect(byId(wrapper, 'prefs-next').attributes('disabled')).toBeDefined()
  })

  it('keeps answers when going back', async () => {
    const wrapper = mount(PreferencesForm)
    await byId(wrapper, 'interest-games').trigger('click')
    await byId(wrapper, 'prefs-next').trigger('click')
    await byId(wrapper, 'prefs-back').trigger('click')
    expect(byId(wrapper, 'interest-games').attributes('aria-pressed')).toBe('true')
  })

  it('can start from existing answers (for an "edit preferences" page)', () => {
    const wrapper = mount(PreferencesForm, {
      props: {
        initial: {
          interests: ['wellness'],
          maxBudget: null,
          energyLevel: 'low',
          groupPreference: 'solo',
        },
      },
    })
    expect(byId(wrapper, 'interest-wellness').attributes('aria-pressed')).toBe('true')
    expect(byId(wrapper, 'prefs-next').attributes('disabled')).toBeUndefined()
  })

  it('shows an error passed in by the page', () => {
    const wrapper = mount(PreferencesForm, { props: { error: "Couldn't save." } })
    expect(byId(wrapper, 'prefs-error').text()).toBe("Couldn't save.")
  })
})
