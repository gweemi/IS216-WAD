// Checks Delete account removes everything linked to the user, in a safe order,
// and that the confirmation dialog needs DELETE typed first.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const log = vi.hoisted(() => [])
const user = vi.hoisted(() => ({ uid: 'me', email: 'me@smu.edu.sg' }))
// Fake Firestore: each query returns the docs listed here
const data = vi.hoisted(() => ({ openjios: [], friendships: [], notifications: [] }))

vi.mock('@/firebase', () => ({ auth: { currentUser: user }, db: {} }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { setCustomParameters() {} },
  reauthenticateWithPopup: vi.fn(async () => log.push('reauth')),
  deleteUser: vi.fn(async () => log.push('delete sign-in')),
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  query: (col, w) => ({ ...col, ...w }),
  where: (field, op, value) => ({ field, op, value }),
  doc: (_db, ...path) => ({ path: path.join('/') }),
  getDocs: vi.fn(async ({ name, field, op, value }) => ({
    docs: data[name]
      .filter((d) => (op === 'array-contains' ? (d[field] ?? []).includes(value) : d[field] === value))
      .map((d) => ({ id: d.id, ref: { path: `${name}/${d.id}` }, data: () => d })),
  })),
  deleteDoc: vi.fn(async (ref) => log.push(`delete ${ref.path}`)),
}))
const setUser = vi.fn()
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ setUser }) }))
vi.mock('@/stores/openjio', () => ({ useOpenJioStore: () => ({ stop: () => log.push('stop jios') }) }))
vi.mock('@/stores/userData', () => ({ forgetCachedUser: (uid) => log.push(`forget cache ${uid}`) }))
vi.mock('@/services/userDataSync', () => ({ startUserDataSync: (uid) => log.push(`sync ${uid}`) }))
vi.mock('@/services/friends', () => ({ startFriends: (uid) => log.push(`friends ${uid}`) }))
vi.mock('@/services/openjio', () => ({
  leaveJio: vi.fn(async (id) => { if (id === 'gone') throw new Error('cancelled'); log.push(`leave ${id}`) }),
  leaveQueue: vi.fn(async (id) => log.push(`leave queue ${id}`)),
  declineJio: vi.fn(async (id) => log.push(`decline ${id}`)),
}))

const { deleteMyAccount, friendlyDeleteError } = await import('@/services/deleteAccount')
const { reauthenticateWithPopup } = await import('firebase/auth')
const { default: DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog.vue')

describe('deleteMyAccount', () => {
  beforeEach(() => {
    log.length = 0
    data.openjios = [
      { id: 'mine', title: 'My picnic', hostId: 'me', participants: ['me', 'amy'], waitlist: [] },
      { id: 'flagged', title: 'Flagged', hostId: 'me', participants: ['me'], waitlist: [], status: 'suspended' },
      { id: 'joined', title: 'Badminton', hostId: 'amy', participants: ['amy', 'me'], waitlist: [] },
      { id: 'gone', title: 'Old jio', hostId: 'ben', participants: ['ben', 'me'], waitlist: [], status: 'cancelled' },
      { id: 'queued', title: 'Climb', hostId: 'ben', participants: ['ben'], waitlist: ['me'] },
      { id: 'invite', title: 'Dinner', hostId: 'ben', participants: ['ben'], waitlist: [], invited: ['me'] },
    ]
    data.friendships = [{ id: 'amy_me', members: ['amy', 'me'] }, { id: 'amy_ben', members: ['amy', 'ben'] }]
    data.notifications = [{ id: 'n1', to: 'me', from: 'amy' }, { id: 'n2', to: 'ben', from: 'me' }, { id: 'n3', to: 'amy', from: 'ben' }]
  })

  it('confirms with Google, stops syncing, then deletes everything linked to the account', async () => {
    const { skipped } = await deleteMyAccount()
    expect(log).toEqual([
      'reauth',
      'sync null', 'friends null', 'stop jios', 'forget cache me',
      'delete openjios/mine',
      'leave joined', // 'gone' is cancelled, so it's skipped
      'leave queue queued',
      'decline invite',
      'delete friendships/amy_me',
      'delete notifications/n1', 'delete notifications/n2',
      'delete users/me/private/wellbeing', 'delete users/me/private/reflections', 'delete users/me/private/gamification',
      'delete users/me',
      'delete sign-in',
    ])
    expect(skipped).toHaveLength(2) // the suspended jio I host, and the cancelled one I couldn't leave
    expect(setUser).toHaveBeenCalledWith(null)
  })

  it('deletes nothing if the Google confirmation is closed', async () => {
    reauthenticateWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' })
    await expect(deleteMyAccount()).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' })
    expect(log).toEqual([])
  })

  it('explains the errors a student might hit', () => {
    expect(friendlyDeleteError({ code: 'auth/popup-closed-by-user' })).toBe('')
    expect(friendlyDeleteError({ code: 'auth/user-mismatch' })).toContain('same Google account')
  })
})

describe('DeleteAccountDialog', () => {
  const dialog = () => mount(DeleteAccountDialog, {
    props: { open: true },
    global: { stubs: { BottomSheet: { template: '<div><slot /></div>' } } },
  })

  it('only lets you delete after typing DELETE', async () => {
    const w = dialog()
    const go = () => w.get('[data-testid="delete-account-confirm"]')
    expect(go().attributes('disabled')).toBeDefined()
    await w.get('[data-testid="delete-account-input"]').setValue('delete')
    expect(go().attributes('disabled')).toBeDefined()
    await w.get('[data-testid="delete-account-input"]').setValue('DELETE')
    expect(go().attributes('disabled')).toBeUndefined()
    await go().trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
  })
})
