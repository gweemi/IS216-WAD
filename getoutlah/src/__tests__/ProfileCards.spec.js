// "My vibe" (preferences) and "Privacy" cards on the Profile page.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const calls = vi.hoisted(() => ({ prefs: [], privacy: [] }))
const store = vi.hoisted(() => ({ value: null }))

vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  store.value = reactive({
    user: { uid: 'me' },
    profile: { displayName: 'En Min', universityName: 'SMU', photoURL: null },
    preferences: { interests: ['arts', 'food'], maxBudget: 20, energyLevel: 'low', groupPreference: 'group' },
  })
  return { useAuthStore: () => store.value }
})
vi.mock('@/services/preferences', () => ({
  savePreferences: vi.fn(async (answers) => {
    calls.prefs.push(answers)
    store.value.preferences = answers
  }),
}))
vi.mock('@/services/privacy', () => ({
  savePrivacy: vi.fn(async (changes) => {
    calls.privacy.push(changes)
    store.value.profile = { ...store.value.profile, privacy: { ...store.value.profile.privacy, ...changes } }
  }),
}))

const { default: PreferencesCard } = await import('@/components/profile/PreferencesCard.vue')
const { default: PrivacyCard } = await import('@/components/profile/PrivacyCard.vue')
const opts = { global: { stubs: { Teleport: true } } }

describe('My vibe card', () => {
  beforeEach(() => (calls.prefs = []))

  it('shows the onboarding answers', () => {
    const text = mount(PreferencesCard, opts).text()
    expect(text).toContain('Arts & culture')
    expect(text).toContain('Food & cafés')
    expect(text).toContain('Up to $20')
    expect(text).toContain('Chill')
    expect(text).toContain('With friends')
  })

  it('edits and saves them with the questionnaire', async () => {
    const w = mount(PreferencesCard, opts)
    await w.find('[data-testid="edit-preferences"]').trigger('click')
    // Starts with the current answers: just go through the steps and save
    await w.find('[data-testid="interest-outdoors"]').trigger('click')
    for (let i = 0; i < 3; i++) await w.find('[data-testid="prefs-next"]').trigger('click')
    await flushPromises()
    expect(calls.prefs).toHaveLength(1)
    expect(calls.prefs[0].interests).toEqual(['arts', 'food', 'outdoors'])
    expect(w.text()).toContain('Outdoors & nature')
    expect(w.text()).toContain('recommendations are updated')
  })
})

describe('Privacy card', () => {
  beforeEach(() => (calls.privacy = []))

  it('previews what others see and updates when a switch is turned off', async () => {
    const w = mount(PrivacyCard, opts)
    expect(w.find('[aria-label="How others see you"]').text()).toContain('SMU')
    await w.find('[data-testid="privacy-showUniversity"]').setValue(false)
    await flushPromises()
    expect(calls.privacy).toEqual([{ showUniversity: false }])
    expect(w.find('[aria-label="How others see you"]').text()).not.toContain('SMU')
  })

  it('says the email is never shown', () => {
    expect(mount(PrivacyCard, opts).text()).toContain('email is never shown')
  })
})
