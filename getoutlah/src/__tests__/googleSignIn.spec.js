// Checks the Google sign-in rules without a real Google pop-up:
// Firebase is replaced with fakes, so we control which account "signs in".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const fake = vi.hoisted(() => ({ user: null, savedDocs: {} }))

vi.mock('@/firebase', () => ({ auth: {}, db: {}, isFirebaseConfigured: true }))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: vi.fn(async () => ({ user: fake.user })),
  signOut: vi.fn(async () => {}),
  onAuthStateChanged: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: (db, collection, id) => `${collection}/${id}`,
  getDoc: vi.fn(async (ref) => ({
    exists: () => ref in fake.savedDocs,
    data: () => fake.savedDocs[ref],
  })),
  setDoc: vi.fn(async (ref, data) => {
    fake.savedDocs[ref] = data
  }),
  serverTimestamp: () => 'now',
}))

const { signInWithGoogle, friendlyError, isCancelled } = await import('@/services/auth')
const { useAuthStore } = await import('@/stores/auth')
const { game, startDemoSession, totalPoints } = await import('@/stores/gamification(badges).js')

function googleUser(email, extra = {}) {
  return {
    uid: 'uid-123',
    email,
    emailVerified: true,
    displayName: 'En Min',
    photoURL: 'https://example.com/photo.jpg',
    getIdToken: vi.fn(async () => 'token'),
    delete: vi.fn(async () => {}),
    ...extra,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  fake.savedDocs = {}
  startDemoSession()
})

describe('Google sign-in', () => {
  it('lets a university account in and tags its university', async () => {
    fake.user = googleUser('enmin.seah.2025@smu.edu.sg')
    await signInWithGoogle()

    expect(fake.savedDocs['users/uid-123']).toMatchObject({
      displayName: 'En Min',
      email: 'enmin.seah.2025@smu.edu.sg',
      universityId: 'smu',
      universityName: 'SMU',
      points: 0,
    })
    expect(useAuthStore().isLoggedIn).toBe(true)
    expect(useAuthStore().mapIntroPending).toBe(true)
    expect(useAuthStore().badgeWelcomePending).toBe(true)
  })

  it('lets a personal Gmail in too, with no university', async () => {
    fake.user = googleUser('enmin@gmail.com')
    await signInWithGoogle()

    expect(fake.user.delete).not.toHaveBeenCalled()
    expect(fake.savedDocs['users/uid-123']).toMatchObject({
      email: 'enmin@gmail.com',
      universityId: null,
      universityName: null,
      points: 0,
    })
    expect(useAuthStore().isLoggedIn).toBe(true)
  })

  it('does not overwrite an existing profile (keeps points)', async () => {
    fake.user = googleUser('enmin@gmail.com')
    fake.savedDocs['users/uid-123'] = { displayName: 'En Min', points: 120 }
    await signInWithGoogle()
    expect(fake.savedDocs['users/uid-123'].points).toBe(120)
  })

  it('keeps the account’s points and badges when logging in (they sync per account now)', async () => {
    game.completed.push({ id: 'extra', title: 'Extra outdoor activity', category: 'outdoors', region: 'east', date: '2026-11-03' })
    game.ledger.push({ date: '2026-11-03', amount: 50, reason: 'Extra outdoor activity' })
    fake.user = googleUser('enmin@gmail.com')

    await signInWithGoogle()

    expect(game.completed.some((activity) => activity.id === 'extra')).toBe(true)
    expect(totalPoints()).toBe(400)
    expect(useAuthStore().mapIntroPending).toBe(true)
  })

  it('treats closing the pop-up as a cancel, not an error', () => {
    expect(isCancelled({ code: 'auth/popup-closed-by-user' })).toBe(true)
    expect(friendlyError({ code: 'auth/popup-blocked' })).toMatch(/pop-up/)
  })
})
