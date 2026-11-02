import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  profile: { displayName: 'Map user' },
  user: { uid: 'map-user' },
  updateDoc: vi.fn(),
  setProfile: vi.fn(),
}))

vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (db, collection, id) => `${collection}/${id}`,
  updateDoc: mocks.updateDoc,
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: mocks.user, profile: mocks.profile, setProfile: mocks.setProfile }),
}))

const { completeMapOnboarding } = await import('@/services/mapOnboarding'
)

describe('map onboarding persistence', () => {
  beforeEach(() => {
    mocks.profile = { displayName: 'Map user' }
    mocks.user = { uid: 'map-user' }
    mocks.updateDoc.mockReset()
    mocks.setProfile.mockReset()
  })

  it('records completion on the signed-in user profile only', async () => {
    await completeMapOnboarding()

    expect(mocks.updateDoc).toHaveBeenCalledWith('users/map-user', { mapOnboardingCompleted: true })
    expect(mocks.setProfile).toHaveBeenCalledWith({ displayName: 'Map user', mapOnboardingCompleted: true })
  })

  it('does not write if no user is signed in', async () => {
    mocks.user = null
    await expect(completeMapOnboarding()).rejects.toThrow('Please log in again.')
    expect(mocks.updateDoc).not.toHaveBeenCalled()
  })
})
