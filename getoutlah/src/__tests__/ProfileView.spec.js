// The Profile page: shows the user's numbers and opens Saved / Completed / My plans.
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
      friendIds: ['f1', 'f2', 'f3'],
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

const mountPage = () =>
  mount(ProfileView, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' }, Teleport: true },
    },
  })

describe('ProfileView', () => {
  beforeEach(() => {
    resetGamification(true) // the 5 demo activities + badges
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

  it('opens Saved and My plans with the right activities', async () => {
    const w = mountPage()
    await w.find('[data-testid="tile-saved"]').trigger('click')
    expect(w.text()).toContain('Pottery taster')
    await w.find('[data-testid="tile-plans"]').trigger('click')
    expect(w.text()).toContain('Sunset kayak')
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

  it('logs out', async () => {
    const w = mountPage()
    await w.find('[data-testid="logout"]').trigger('click')
    await flushPromises()
    expect(calls.logOut).toBe(1)
    expect(calls.routes).toContainEqual({ name: 'auth' })
  })
})
