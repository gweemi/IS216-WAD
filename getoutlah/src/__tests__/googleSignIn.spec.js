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

  it('treats closing the pop-up as a cancel, not an error', () => {
    expect(isCancelled({ code: 'auth/popup-closed-by-user' })).toBe(true)
    expect(friendlyError({ code: 'auth/popup-blocked' })).toMatch(/pop-up/)
  })
})
