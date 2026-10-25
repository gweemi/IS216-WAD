// Checks the questionnaire rules and that answers are saved correctly.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const saved = vi.hoisted(() => ({ calls: [] }))

vi.mock('@/firebase', () => ({ auth: {}, db: {}, isFirebaseConfigured: true }))
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  doc: (db, collection, id) => `${collection}/${id}`,
  getDoc: vi.fn(),
  updateDoc: vi.fn(async (ref, data) => saved.calls.push({ ref, data })),
  serverTimestamp: () => 'now',
}))

const { validatePreferences, savePreferences } = await import('@/services/preferences')
const { useAuthStore } = await import('@/stores/auth')
const { INTERESTS, BUDGETS, ENERGY_LEVELS, GROUP_PREFERENCES } =
  await import('@/config/preferences')

const good = {
  interests: ['outdoors', 'food'],
  maxBudget: 20,
  energyLevel: 'high',
  groupPreference: 'group',
}

beforeEach(() => {
  setActivePinia(createPinia())
  saved.calls = []
})

describe('validatePreferences', () => {
  it('accepts a complete set of answers', () => {
    expect(validatePreferences(good)).toEqual([])
  })

  it('accepts "price doesn\'t matter" (null) and "free only" (0)', () => {
    expect(validatePreferences({ ...good, maxBudget: null })).toEqual([])
    expect(validatePreferences({ ...good, maxBudget: 0 })).toEqual([])
  })

  it.each([
    ['no interests', { interests: [] }],
    ['an unknown interest', { interests: ['skydiving'] }],
    ['a made-up budget', { maxBudget: 999 }],
    ['a missing budget', { maxBudget: undefined }],
    ['a missing energy level', { energyLevel: '' }],
    ['an unknown group preference', { groupPreference: 'crowd' }],
  ])('rejects %s', (_, change) => {
    expect(validatePreferences({ ...good, ...change }).length).toBeGreaterThan(0)
  })
})

describe('the options match firestore.rules', () => {
  // If someone adds an option in src/config/preferences.js but forgets
  // firestore.rules, the database would refuse to save it. This catches that.
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
  const listAfter = (marker) => {
    const start = rules.indexOf(marker)
    const inside = rules.slice(rules.indexOf('[', start) + 1, rules.indexOf(']', start))
    return inside.split(',').map((s) => s.trim().replace(/'/g, ''))
  }

  it('allows exactly the interests in the questionnaire', () => {
    expect(listAfter('p.interests.hasOnly(')).toEqual(INTERESTS.map((i) => i.id))
  })

  it('allows exactly the budgets in the questionnaire', () => {
    const ruleBudgets = listAfter('p.maxBudget in').map(Number)
    const formBudgets = BUDGETS.map((b) => b.maxBudget).filter((b) => b !== null)
    expect(ruleBudgets).toEqual(formBudgets)
  })

  it('allows exactly the energy levels and group options in the questionnaire', () => {
    expect(listAfter('p.energyLevel in')).toEqual(ENERGY_LEVELS.map((o) => o.id))
    expect(listAfter('p.groupPreference in')).toEqual(GROUP_PREFERENCES.map((o) => o.id))
  })
})

describe('savePreferences', () => {
  it('saves the answers to the user profile and updates the store', async () => {
    const store = useAuthStore()
    store.setUser({ uid: 'uid-123' })
    store.setProfile({ displayName: 'En Min', points: 0 })

    await savePreferences({ ...good, interests: ['food', 'food', 'arts'] })

    expect(saved.calls).toHaveLength(1)
    expect(saved.calls[0].ref).toBe('users/uid-123')
    expect(saved.calls[0].data.preferences).toEqual({
      interests: ['food', 'arts'], // duplicates removed
      maxBudget: 20,
      energyLevel: 'high',
      groupPreference: 'group',
    })
    expect(store.hasPreferences).toBe(true)
    expect(store.profile.displayName).toBe('En Min') // rest of the profile kept
  })

  it('refuses to save incomplete answers', async () => {
    useAuthStore().setUser({ uid: 'uid-123' })
    await expect(savePreferences({ ...good, energyLevel: '' })).rejects.toThrow(
      'Pick an energy level.',
    )
    expect(saved.calls).toHaveLength(0)
  })
})
