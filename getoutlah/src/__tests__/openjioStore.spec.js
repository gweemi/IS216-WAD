// Checks which jios go where: Activities (public), invites, and "My jios".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/openjio', () => ({ watchJios: vi.fn(), friendlyJioError: (e) => e.message }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { uid: 'me' }, profile: {} }) }))

const { useOpenJioStore } = await import('@/stores/openjio')

const later = new Date(Date.now() + 86400000)
const jio = (id, changes) => ({
  id,
  startAt: later,
  durationMins: 60,
  capacity: 5,
  visibility: 'public',
  hostId: 'host',
  participants: ['host'],
  waitlist: [],
  invited: [],
  status: 'open',
  ...changes,
})

let store
beforeEach(() => {
  setActivePinia(createPinia())
  store = useOpenJioStore()
  store.all = [
    jio('public'),
    jio('public-going', { participants: ['host', 'me'] }),
    jio('invite', { visibility: 'friends', invited: ['me'] }),
    jio('not-invited', { visibility: 'friends', invited: ['someone'] }),
    jio('mine-private', { visibility: 'friends', hostId: 'me', participants: ['me'], invited: ['x'] }),
    jio('ended', { startAt: new Date(Date.now() - 86400000) }),
  ]
})

const ids = (list) => list.map((j) => j.id)

describe('openjio store', () => {
  it('sends only public, upcoming jios to Activities', () => {
    expect(ids(store.publicUpcoming)).toEqual(['public', 'public-going'])
  })

  it('lists invites you have not answered yet', () => {
    expect(ids(store.invites)).toEqual(['invite'])
  })

  it('lists jios you host or joined under My jios', () => {
    expect(ids(store.mine)).toEqual(['public-going', 'mine-private'])
  })

  it('never shows friends-only jios you were not invited to', () => {
    expect(ids(store.visible)).not.toContain('not-invited')
  })
})
