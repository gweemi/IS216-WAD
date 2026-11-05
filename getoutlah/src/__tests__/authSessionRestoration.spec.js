import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const authEvents = vi.hoisted(() => ({ callback: null }))

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_, callback) => {
    authEvents.callback = callback
    return () => {}
  }),
}))
vi.mock('firebase/firestore', () => ({
  doc: (_, collection, id) => `${collection}/${id}`,
  getDoc: vi.fn(async () => ({ exists: () => true, data: () => ({ displayName: 'En Min' }) })),
}))

const { useAuthStore } = await import('@/stores/auth')
const { game, resetGamification } = await import('@/stores/gamification(badges).js')

describe('Firebase session restoration', () => {
  it('keeps the in-progress badge data instead of resetting it', async () => {
    setActivePinia(createPinia())
    resetGamification(true)
    game.completed.push({ id: 'kept-after-refresh', title: 'Kept activity', category: 'outdoors', region: 'east', date: '2026-11-03' })

    const store = useAuthStore()
    const ready = store.init()
    await authEvents.callback({ uid: 'uid-restored' })
    await ready

    expect(store.isLoggedIn).toBe(true)
    expect(game.completed.some((activity) => activity.id === 'kept-after-refresh')).toBe(true)
  })
})
