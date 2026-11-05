import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const calls = vi.hoisted(() => ({ logOut: 0, routes: [], toggled: [] }))

const authStore = vi.hoisted(() => ({ value: null }))
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  authStore.value = reactive({
    email: 'enmin.seah.2025@smu.edu.sg',
    user: { uid: 'me', photoURL: null },
    profile: {
      displayName: 'En Min Seah',
      universityName: 'SMU',
      saved: ['a1'],
      plans: ['a2'],
    },
    preferences: null,
    isAdmin: false,
    setProfile(p) {
      this.profile = p
    },
  })
  return { useAuthStore: () => authStore.value }
})
vi.mock('@/services/privacy', () => ({ savePrivacy: async () => {} }))
const deleteCalls = vi.hoisted(() => ({ count: 0 }))
vi.mock('@/services/deleteAccount', () => ({
  deleteMyAccount: async () => { deleteCalls.count++; return { skipped: [] } },
  friendlyDeleteError: (e) => e.message,
}))
vi.mock('@/services/preferences', () => ({ savePreferences: async () => {} }))
vi.mock('@/stores/openjio', () => ({ useOpenJioStore: () => ({ start: () => {}, visible: [] }) }))
vi.mock('@/services/auth', () => ({
  ensureUserProfile: vi.fn(),
  logOut: vi.fn(async () => (calls.logOut += 1)),
}))
vi.mock('@/stores/activities', async () => {
  const { ref } = await import('vue')
  const list = [
    { id: 'a1', title: 'Pottery taster', category: 'workshops', area: 'Bugis', cost: 35 },
    { id: 'a2', title: 'Sunset kayak', category: 'outdoors', area: 'Kallang', cost: 0 },
  ]
  return {
    allActivities: ref(list),
    activityById: (id) => list.find((a) => a.id === id),
    loadActivities: async () => {},
    toggleSaved: async (id) => calls.toggled.push(id),
  }
})
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: (to) => calls.routes.push(to), push: (to) => calls.routes.push(to) }),
}))

const { default: ProfileView } = await import('@/views/ProfileView.vue')
const { resetGamification } = await import('@/stores/gamification(badges).js')
const { friendsState, resetFriendsState } = await import('@/stores/friends')

const mountPage = () =>
  mount(ProfileView, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' }, Teleport: true },
    },
  })

describe('ProfileView', () => {
  beforeEach(() => {
    resetGamification(true)
    resetFriendsState()
    friendsState.uid = 'me'
    friendsState.friendships = [
      { id: 'f1_me', members: ['f1', 'me'], status: 'accepted', requestedBy: 'me', names: { f1: 'Amy' } },
      { id: 'f2_me', members: ['f2', 'me'], status: 'accepted', requestedBy: 'f2', names: { f2: 'Ben' } },
      { id: 'f3_me', members: ['f3', 'me'], status: 'accepted', requestedBy: 'me', names: { f3: 'Cai' } },
      { id: 'f4_me', members: ['f4', 'me'], status: 'pending', requestedBy: 'f4', names: { f4: 'Dee' } },
    ]
    calls.logOut = 0
    calls.routes = []
  })

  it('greets the user and shows their profile numbers', () => {
    const w = mountPage()
    expect(w.find('[data-testid="profile-greeting"]').text()).toBe('Looking good, En')
    expect(w.find('[data-testid="profile-name"]').text()).toBe('En Min Seah')
    expect(w.find('[data-testid="profile-university"]').text()).toContain('SMU')
    expect(w.find('[data-testid="stat-completed"]').text()).toContain('5')
    expect(w.find('[data-testid="stat-friends"]').text()).toContain('3')
    expect(w.find('[data-testid="stat-badges"]').text()).toMatch(/\d+\s*Badges/)
  })

  it('updates the Friends number as soon as a request is accepted', async () => {
    const w = mountPage()
    friendsState.friendships[3].status = 'accepted'
    await w.vm.$nextTick()
    expect(w.find('[data-testid="stat-friends"]').text()).toContain('4')
  })

  it('opens Saved and My plans', async () => {
    const w = mountPage()
    await w.find('[data-testid="tile-saved"]').trigger('click')
    expect(w.text()).toContain('Pottery taster')
    await w.find('[data-testid="tile-plans"]').trigger('click')
    expect(w.text()).toContain('Join or host an OPENJIO!')
  })

  it('opens Completed from the number on the profile card', async () => {
    const w = mountPage()
    await w.find('[data-testid="stat-completed"]').trigger('click')
    expect(w.text()).toContain('MacRitchie TreeTop Walk')
  })

  it('shows the Admin button only to admins', async () => {
    const w = mountPage()
    expect(w.find('[data-testid="admin-link"]').exists()).toBe(false)
    authStore.value.isAdmin = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="admin-link"]').exists()).toBe(true)
    authStore.value.isAdmin = false
  })

  it('turns study-break mode on and off', async () => {
    const { game } = await import('@/stores/gamification(badges).js')
    const w = mountPage()
    const sw = w.find('[data-testid="study-break-switch"]')
    await sw.setValue(true)
    expect(game.studyBreak.active).toBe(true)
    expect(w.find('[data-testid="study-break"]').text()).toContain('paused')
    await sw.setValue(false)
    expect(game.studyBreak.active).toBe(false)
  })

  it('has the private reflections section', () => {
    expect(mountPage().text()).toContain('My reflections')
  })

  it('shows the My vibe and Privacy cards', () => {
    const w = mountPage()
    expect(w.find('[data-testid="preferences-card"]').exists()).toBe(true)
    expect(w.find('[data-testid="privacy-card"]').exists()).toBe(true)
  })

  it('keeps the log-out icon and text as separate pieces', () => {
    const btn = mountPage().find('[data-testid="logout"]')
    expect(btn.find('i.ph-sign-out').exists()).toBe(true)
    expect(btn.find('span').text()).toBe('Log out')
  })

  it('asks for confirmation before logging out', async () => {
    const w = mountPage()
    await w.find('[data-testid="logout"]').trigger('click')

    expect(calls.logOut).toBe(0)
    expect(w.get('[role="dialog"]').text()).toContain('Are you sure you want to log out?')

    await w.get('[data-testid="logout-cancel"]').trigger('click')
    expect(calls.logOut).toBe(0)

    await w.find('[data-testid="logout"]').trigger('click')
    await w.get('[data-testid="logout-confirm"]').trigger('click')
    await flushPromises()
    expect(calls.logOut).toBe(1)
    expect(calls.routes).toContainEqual({ name: 'login' })
  })

  it('deletes the account only after confirming, then goes to the login page', async () => {
    const w = mountPage()
    await w.get('[data-testid="delete-account"]').trigger('click')
    expect(w.get('[data-testid="delete-account-dialog"]').text()).toContain('Delete your account?')
    expect(deleteCalls.count).toBe(0)

    await w.get('[data-testid="delete-account-confirm"]').trigger('click')
    await flushPromises()
    expect(deleteCalls.count).toBe(1)
    expect(calls.routes).toContainEqual({ name: 'login' })
  })
})
