import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const state = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    filters: ref({ query: '', categories: [], sources: [], maxCost: null, maxHours: null, setting: 'Any', energy: 'Any', onlySlots: false, prioritiseFreeTime: false }),
    recommended: ref([]),
    loadingActivities: ref(false),
    sourceErrors: ref({}),
    activityRefreshRequired: ref(false),
    openJioLoadError: ref(''),
    loadActivities: vi.fn(),
    jios: { uid: 'me', all: [] },
  }
})

vi.mock('@/stores/activities', () => ({
  filters: state.filters,
  recommended: computed(() => state.recommended.value),
  loadingActivities: state.loadingActivities,
  sourceErrors: state.sourceErrors,
  activityRefreshRequired: state.activityRefreshRequired,
  openJioLoadError: state.openJioLoadError,
  loadActivities: state.loadActivities,
}))
vi.mock('@/utils/activeFilters', () => ({ activeFilterPills: () => [] }))
vi.mock('@/components/ActivityCard.vue', () => ({ default: { template: '<li />' } }))
vi.mock('@/components/FilterSheet.vue', () => ({ default: { name: 'FilterSheet', props: ['open', 'showSources'], template: '<div />' } }))
vi.mock('@/components/openjio/JioCard.vue', () => ({ default: { name: 'JioCard', props: ['jio', 'uid', 'showDetails'], template: '<article />' } }))
vi.mock('@/stores/openjio', () => ({ useOpenJioStore: () => state.jios }))

const { default: ActivitiesView } = await import('@/views/ActivitiesView.vue')

const makeRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/activities', name: 'activities', component: ActivitiesView }],
})

async function mountAt(path = '/activities') {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  return { router, wrapper: mount(ActivitiesView, { global: { plugins: [router] } }) }
}

beforeEach(() => {
  state.filters.value = { query: '', categories: [], sources: [], maxCost: null, maxHours: null, setting: 'Any', energy: 'Any', onlySlots: false, prioritiseFreeTime: false }
  state.recommended.value = []
  state.loadActivities.mockReset()
  state.activityRefreshRequired.value = false
  state.openJioLoadError.value = ''
  state.jios.all = []
})

describe('ActivitiesView source discovery', () => {
  it('shows all source explanations and hides the duplicate filter-sheet Source selector', async () => {
    const { wrapper } = await mountAt()
    expect(wrapper.text()).toContain('GetOutLah Picks')
    expect(wrapper.text()).toContain('External Listings')
    expect(wrapper.text()).toContain('OPENJIO!')
    expect(wrapper.findComponent({ name: 'FilterSheet' }).props('showSources')).toBe(false)
  })

  it('asks the user to refresh after a Firestore permission cutover', async () => {
    state.activityRefreshRequired.value = true
    const { wrapper } = await mountAt()
    expect(wrapper.text()).toContain('Activity data has been updated.')
    expect(wrapper.get('.act-refresh').text()).toBe('Refresh the page')
  })

  it('reads a canonical source from the URL and writes a single shared source filter', async () => {
    const { wrapper } = await mountAt('/activities?view=externalListings')
    expect(state.filters.value.sources).toEqual(['externalListings'])
    expect(wrapper.find('h2.gol-section-title').text()).toBe('Explore External Listings')
  })

  it('changes the URL when a source pill is selected and treats invalid views as all activities', async () => {
    const { router, wrapper } = await mountAt('/activities?view=not-real')
    expect(state.filters.value.sources).toEqual([])
    const push = vi.spyOn(router, 'push')
    await wrapper.get('[data-testid="source-openJio"]').trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'activities', query: { view: 'openJio' } })
    await router.push({ name: 'activities', query: { view: 'openJio' } })
    expect(state.filters.value.sources).toEqual(['openJio'])
  })

  it('shows OPENJIO discovery controls only for the OPENJIO source', async () => {
    const { wrapper } = await mountAt('/activities?view=openJio')
    expect(wrapper.text()).toContain('All Jios')
    expect(wrapper.text()).toContain('Friends Only')
    expect(wrapper.text()).toContain('Manage OPENJIOs')
    expect(wrapper.text()).toContain('Explore public jios')
    expect(wrapper.text()).toContain('Invited')
  })

  it('uses the selected OPENJIO visibility context in its empty state and clears extra filters only', async () => {
    state.filters.value.query = 'nothing'
    const { router, wrapper } = await mountAt('/activities?view=openJio')
    await router.push('/activities?view=openJio&visibility=public')
    expect(wrapper.text()).toContain('No public jios match your filters right now.')
    const clear = wrapper.get('.act-empty-clear')
    await clear.trigger('click')
    expect(state.filters.value.query).toBe('')
    expect(state.filters.value.sources).toEqual(['openJio'])
  })

  it('filters OPENJIO activities by their preserved public or friends-only visibility', async () => {
    state.recommended.value = [
      { id: 'public-jio', source: 'openJio', visibility: 'public' },
      { id: 'friends-jio', source: 'openJio', visibility: 'friends_only' },
    ]
    const { router, wrapper } = await mountAt('/activities?view=openJio')

    expect(wrapper.find('.act-count').text()).toBe('2 activities')
    await router.push('/activities?view=openJio&visibility=public')
    expect(wrapper.find('.act-count').text()).toBe('1 activities')
    await router.push('/activities?view=openJio&visibility=friends_only')
    expect(wrapper.find('.act-count').text()).toBe('1 activities')
  })

  it('uses the Invited URL view for pending explicit invitations only', async () => {
    state.recommended.value = [
      { id: 'invite', source: 'openJio', visibility: 'invite_only', viewerInvited: true, viewerRole: 'none' },
      { id: 'legacy', source: 'openJio', visibility: 'friends', viewerInvited: true, viewerRole: 'none' },
      { id: 'friend-circle', source: 'openJio', visibility: 'friends_only', viewerInvited: false, viewerRole: 'none' },
      { id: 'already-going', source: 'openJio', visibility: 'invite_only', viewerInvited: true, viewerRole: 'going' },
    ]
    const { router, wrapper } = await mountAt('/activities?view=openJio&visibility=invited')
    expect(wrapper.find('.act-count').text()).toBe('2 activities')
    expect(wrapper.text()).toContain('See jios you’ve been personally invited to.')
    expect(router.currentRoute.value.query.view).toBe('openJio')
  })
})
