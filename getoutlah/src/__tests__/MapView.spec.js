import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const leafletMocks = vi.hoisted(() => {
  const handlers = {}
  const mapInstance = {
    flyTo: vi.fn(),
    getSize: vi.fn(() => ({ x: 1000, y: 800 })),
    getBounds: vi.fn(() => ({ contains: vi.fn(() => false) })),
    getZoom: vi.fn(() => 12),
    latLngToContainerPoint: vi.fn(() => ({ x: 120, y: 100 })),
    on: vi.fn((event, callback) => { handlers[event] = callback }),
    off: vi.fn(),
    project: vi.fn(([, lng]) => ({ x: lng * 1000, y: 1300 })),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    panTo: vi.fn(),
    setView: vi.fn(),
    setZoom: vi.fn(),
    stop: vi.fn(),
    unproject: vi.fn(([x, y], zoom) => ({ x, y, zoom })),
  }
  mapInstance.setView.mockImplementation(() => mapInstance)

  const mocks = {
    addLayers: vi.fn(),
    addTo: vi.fn(),
    clearLayers: vi.fn(),
    clusterAddTo: vi.fn(),
    divIcon: vi.fn(),
    handlers,
    mapInstance,
    markerInstances: [],
    marker: vi.fn(() => {
      const handlers = {}
      const marker = {
        handlers,
        on: vi.fn((event, callback) => { handlers[event] = callback }),
        openTooltip: vi.fn(),
        closeTooltip: vi.fn(),
        setZIndexOffset: vi.fn(),
      }
      marker.addTo = vi.fn(() => marker)
      mocks.markerInstances.push(marker)
      return marker
    }),
    circleMarker: vi.fn(() => ({ addTo: vi.fn(), bindTooltip: vi.fn() })),
    circle: vi.fn(() => {
      const circle = { addTo: vi.fn(), setLatLng: vi.fn(), setRadius: vi.fn() }
      circle.addTo.mockReturnValue(circle)
      return circle
    }),
    zoomControlAddTo: vi.fn(),
  }
  return mocks
})

const routerMocks = vi.hoisted(() => ({ push: vi.fn() }))
const authMocks = vi.hoisted(() => ({
  user: { uid: 'map-user' },
  profile: { mapOnboardingCompleted: true },
  isLoggedIn: true,
  mapIntroPending: false,
  badgeWelcomePending: false,
  consumeMapIntro: vi.fn(),
  consumeBadgeWelcome: vi.fn(),
  setProfile: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => routerMocks }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => authMocks }))

const activityMocks = vi.hoisted(() => ({
  items: [
    {
      id: 'shared-1',
      title: 'Shared walk',
      category: 'outdoors',
      cost: 0,
      durationHrs: 1,
      region: 'central',
      lat: 1.3,
      lng: 103.8,
    },
    {
      id: 'shared-2',
      title: 'Shared event',
      category: 'events',
      cost: 10,
      durationHrs: 2,
      lat: 1.32,
      lng: 103.82,
      area: 'Downtown',
      region: 'east',
      seriesId: 'shared-event-series',
    },
    {
      id: 'shared-3',
      title: 'Shared event',
      category: 'events',
      cost: 10,
      durationHrs: 2,
      lat: 1.32,
      lng: 103.82,
      area: 'Downtown',
      region: 'east',
      seriesId: 'shared-event-series',
    },
  ],
  loadActivities: vi.fn(),
}))

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => leafletMocks.mapInstance),
    tileLayer: vi.fn(() => ({ addTo: leafletMocks.addTo, on: vi.fn() })),
    markerClusterGroup: vi.fn(() => ({
      addTo: leafletMocks.clusterAddTo,
      clearLayers: leafletMocks.clearLayers,
      addLayers: leafletMocks.addLayers,
    })),
    marker: leafletMocks.marker,
    circle: leafletMocks.circle,
    circleMarker: leafletMocks.circleMarker,
    divIcon: leafletMocks.divIcon,
  },
}))

vi.mock('leaflet.markercluster', () => ({}))
vi.mock('@/composables/useGeolocation', async () => {
  const { ref } = await import('vue')
  const coords = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const request = vi.fn()
  const clear = vi.fn(() => { coords.value = null; error.value = null })
  return {
    useGeolocation: () => ({ coords, error, loading, request, clear }),
    geolocationMocks: { coords, error, loading, request, clear },
  }
})
vi.mock('@/stores/activities', async () => {
  const { computed, ref } = await import('vue')
  const filters = ref({
    query: '', categories: [], regions: [], sources: [], maxCost: null, maxHours: null, setting: 'Any', energy: 'Any',
    onlySlots: false, prioritiseFreeTime: false,
  })
  const allActivities = ref(activityMocks.items)
  const filtered = computed(() => allActivities.value.filter((activity) =>
    (!filters.value.query || `${activity.title} ${activity.area ?? ''}`.toLowerCase().includes(filters.value.query.toLowerCase())) &&
    (!filters.value.categories.length || filters.value.categories.includes(activity.category)) &&
    (!filters.value.regions.length || filters.value.regions.includes(activity.region)),
  ))

  return {
    allActivities,
    filters,
    filtered,
    oneCardPerEvent: (items) => {
      const seen = new Set()
      return items.filter((item) => {
        const key = item.seriesId ?? `${item.title}|${item.area ?? ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    weatherAt: () => null,
    recommended: filtered,
    loadActivities: activityMocks.loadActivities,
    resetFilters: vi.fn(),
  }
})

const { default: MapView } = await import('@/views/MapView.vue')
const { filters } = await import('@/stores/activities')
const { geolocationMocks } = await import('@/composables/useGeolocation')
const { useBadgeHunt } = await import('@/composables/useBadgeHunt')
const { startDemoSession } = await import('@/stores/gamification(badges).js')
const badgeHunt = useBadgeHunt()
const mountedWrappers = []
const mountMap = () => {
  const wrapper = mount(MapView)
  mountedWrappers.push(wrapper)
  return wrapper
}
const expandCategories = async (wrapper) => {
  await wrapper.get('[data-testid="map-category-toggle"]').trigger('click')
  await nextTick()
}

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    badgeHunt.clearTrackedBadge()
    startDemoSession()
    leafletMocks.mapInstance.getZoom.mockReturnValue(12)
    leafletMocks.markerInstances.length = 0
    Object.keys(leafletMocks.handlers).forEach((event) => delete leafletMocks.handlers[event])
    filters.value = {
      query: '', categories: [], regions: [], sources: [], maxCost: null, maxHours: null, setting: 'Any', energy: 'Any',
      onlySlots: false, prioritiseFreeTime: false,
    }
    geolocationMocks.coords.value = null
    geolocationMocks.error.value = null
    geolocationMocks.loading.value = false
    geolocationMocks.request.mockReset()
    geolocationMocks.clear.mockClear()
    authMocks.user = { uid: 'map-user' }
    authMocks.profile = { mapOnboardingCompleted: true }
    authMocks.isLoggedIn = true
    authMocks.mapIntroPending = false
    authMocks.badgeWelcomePending = false
    authMocks.consumeMapIntro.mockImplementation(() => {
      const pending = authMocks.mapIntroPending
      authMocks.mapIntroPending = false
      return pending
    })
    authMocks.consumeBadgeWelcome.mockImplementation(() => {
      const pending = authMocks.badgeWelcomePending
      authMocks.badgeWelcomePending = false
      return pending
    })
    authMocks.setProfile.mockClear()
  })

  afterEach(() => {
    badgeHunt.clearTrackedBadge()
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders the collapsed category pill beside the visual search, filter, and zoom controls', () => {
    const wrapper = mountMap()

    expect(wrapper.get('[data-testid="map-search-input"]').attributes('placeholder')).toBe(
      'Search activities, places...',
    )
    expect(wrapper.get('[data-testid="map-filter-button"]').attributes('aria-label')).toBe(
      'Open activity filters',
    )
    const categoryToggle = wrapper.get('[data-testid="map-category-toggle"]')
    expect(categoryToggle.attributes('aria-expanded')).toBe('false')
    expect(categoryToggle.text()).toContain('All Categories')
    const zoom = wrapper.get('[data-testid="map-zoom-slider"]')
    expect(zoom.attributes()).toMatchObject({ min: '11', max: '18', step: '1', orient: 'vertical' })
    expect(zoom.attributes('aria-valuetext')).toBe('Map zoom level 12')
    expect(wrapper.find('.map-zoom-control__value').exists()).toBe(false)
    expect(wrapper.findAll('.map-zoom-control__marker').map((marker) => marker.text())).toEqual(['+', '−'])
  })

  it('updates the map from the zoom slider and syncs after external zooms', async () => {
    const wrapper = mountMap()
    const zoom = wrapper.get('[data-testid="map-zoom-slider"]')

    await zoom.setValue('15')
    expect(leafletMocks.mapInstance.setZoom).toHaveBeenCalledWith(15, { animate: true })

    leafletMocks.mapInstance.getZoom.mockReturnValue(16)
    leafletMocks.handlers.zoomend()
    await nextTick()
    expect(zoom.element.value).toBe('16')
  })

  it('removes the custom zoom slider on mobile and restores it after resizing to desktop', async () => {
    let mobileViewport = true
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(max-width: 767.98px)' ? mobileViewport : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const wrapper = mountMap()

    expect(wrapper.find('[data-testid="map-zoom-slider"]').exists()).toBe(false)

    mobileViewport = false
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.find('[data-testid="map-zoom-slider"]').exists()).toBe(true)

    mobileViewport = true
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.find('[data-testid="map-zoom-slider"]').exists()).toBe(false)
  })

  it('uses an immediate zoom transition when reduced motion is enabled', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const wrapper = mountMap()

    await wrapper.get('[data-testid="map-zoom-slider"]').setValue('14')

    expect(leafletMocks.mapInstance.setZoom).toHaveBeenCalledWith(14, { animate: false })
  })

  it('automatically tracks the closest achievable badge when Map activities are ready', async () => {
    const wrapper = mountMap()
    await nextTick()
    await nextTick()

    expect(badgeHunt.trackedBadgeId.value).toBe('trailblazer')
    expect(wrapper.get('[data-testid="next-badge-card"]').text()).toContain('Next badge')
    expect(wrapper.get('[data-testid="next-badge-card"]').text()).toContain('Trailblazer')
  })

  it('opens the selector once after an explicit login and keeps the recommendation when it is dismissed', async () => {
    authMocks.badgeWelcomePending = true
    const wrapper = mountMap()
    await nextTick()
    await nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Choose a badge to explore')
    expect(authMocks.consumeBadgeWelcome).toHaveBeenCalledTimes(1)

    document.body.querySelector('.hunt-header .gol-close').click()
    await nextTick()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.get('[data-testid="next-badge-card"]').text()).toContain('Trailblazer')
  })

  it('keeps a manually selected badge when map filters change', async () => {
    badgeHunt.selectTrackedBadge('event-chaser')
    const wrapper = mountMap()
    await nextTick()
    await expandCategories(wrapper)

    await wrapper.get('[data-testid="map-category-outdoors"]').trigger('click')
    await nextTick()

    expect(badgeHunt.trackedBadgeId.value).toBe('event-chaser')
  })

  it('filters markers with multiple category selections and restores All after the last deselection', async () => {
    const wrapper = mountMap()
    await expandCategories(wrapper)

    await wrapper.get('[data-testid="map-category-events"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-category-events"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="map-category-all"]').attributes('aria-pressed')).toBe('false')
    expect(leafletMocks.addLayers).toHaveBeenLastCalledWith(expect.any(Array))
    expect(leafletMocks.addLayers.mock.calls.at(-1)[0]).toHaveLength(1)

    await wrapper.get('[data-testid="map-category-outdoors"]').trigger('click')
    await nextTick()
    expect(filters.value.categories).toEqual(['events', 'outdoors'])
    expect(leafletMocks.addLayers.mock.calls.at(-1)[0]).toHaveLength(2)

    await wrapper.get('[data-testid="map-search-input"]').setValue('does not exist')
    await nextTick()
    expect(wrapper.get('.map-empty').text()).toContain('No activities match')

    await wrapper.get('[data-testid="map-category-all"]').trigger('click')
    await nextTick()
    expect(filters.value.categories).toEqual([])
    expect(wrapper.get('[data-testid="map-category-all"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-testid="map-category-outdoors"]').trigger('click')
    await wrapper.get('[data-testid="map-category-outdoors"]').trigger('click')
    await nextTick()
    expect(filters.value.categories).toEqual([])
    expect(wrapper.get('[data-testid="map-category-all"]').attributes('aria-pressed')).toBe('true')
  })

  it('preserves selected categories after collapsing and reopening the selector', async () => {
    const wrapper = mountMap()
    await expandCategories(wrapper)
    await wrapper.get('[data-testid="map-category-outdoors"]').trigger('click')
    await wrapper.get('[data-testid="map-search-input"]').setValue('walk')

    await wrapper.get('[data-testid="map-category-collapse"]').trigger('click')
    await nextTick()
    const toggle = wrapper.get('[data-testid="map-category-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toContain('Outdoors & nature')
    await expandCategories(wrapper)
    expect(wrapper.get('[data-testid="map-category-outdoors"]').attributes('aria-pressed')).toBe('true')
    expect(filters.value).toMatchObject({ query: 'walk', categories: ['outdoors'] })
  })

  it('removes category controls from the advanced map filters', async () => {
    const wrapper = mountMap()

    await wrapper.get('[data-testid="map-filter-button"]').trigger('click')

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(wrapper.findComponent({ name: 'FilterSheet' }).props('showCategories')).toBe(false)
    expect(document.body.querySelector('[role="dialog"]').textContent).not.toContain('Category')
    expect(wrapper.findComponent({ name: 'FilterSheet' }).props('showRegions')).toBe(true)
    expect(document.body.querySelector('[role="dialog"]').textContent).toContain('Area')
    expect(wrapper.findComponent({ name: 'FilterSheet' }).props('showNearby')).toBe(false)
  })

  it('filters markers by selected area from advanced filters and includes South', async () => {
    const wrapper = mountMap()
    expect(wrapper.find('[data-testid="map-area-east"]').exists()).toBe(false)
    await wrapper.get('[data-testid="map-filter-button"]').trigger('click')
    document.body.querySelector('[data-testid="map-area-east"]').click()
    await nextTick()

    expect(filters.value.regions).toEqual(['east'])
    expect(leafletMocks.addLayers.mock.calls.at(-1)[0]).toHaveLength(1)
    expect(document.body.querySelector('[data-testid="map-area-south"]')).not.toBeNull()
  })

  it('requests location only when Near me is enabled, then shows a temporary map dot', async () => {
    geolocationMocks.request.mockImplementation(async () => {
      geolocationMocks.coords.value = { lat: 1.31, lng: 103.81 }
      return geolocationMocks.coords.value
    })
    const wrapper = mountMap()

    expect(geolocationMocks.request).not.toHaveBeenCalled()
    const nearbyToggle = wrapper.get('[data-testid="map-nearby-toggle"]')
    expect(nearbyToggle.attributes('aria-checked')).toBe('false')
    await nearbyToggle.trigger('click')
    expect(geolocationMocks.request).not.toHaveBeenCalled()
    expect(wrapper.get('[role="dialog"]').text()).toContain('Find activities near you?')
    await wrapper.get('.map-intro-dialog__enable').trigger('click')
    await nextTick()
    await nextTick()

    expect(geolocationMocks.request).toHaveBeenCalledTimes(1)
    expect(leafletMocks.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      className: 'map-user-location-marker-wrapper',
      html: expect.stringContaining('YOU ARE HERE'),
    }))
    expect(leafletMocks.mapInstance.panTo).toHaveBeenCalledWith([1.31, 103.81], { animate: true, duration: .75 })
    expect(leafletMocks.circle).toHaveBeenCalledWith([1.31, 103.81], expect.objectContaining({ radius: 5000, interactive: false }))
    expect(nearbyToggle.attributes('aria-checked')).toBe('true')

    await wrapper.get('[data-testid="map-nearby-radius"]').setValue(1)
    await nextTick()
    await nextTick()
    expect(leafletMocks.circle.mock.results[0].value.setRadius).toHaveBeenCalledWith(1000)
    expect(wrapper.find('.map-empty').exists()).toBe(true)

    await nearbyToggle.trigger('click')
    await nextTick()
    expect(nearbyToggle.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[data-testid="map-nearby-radius"]').exists()).toBe(false)
    expect(leafletMocks.mapInstance.removeLayer).toHaveBeenCalled()
  })

  it('keeps Near me disabled if the browser cannot provide a location', async () => {
    geolocationMocks.error.value = 'Location permission was not granted.'
    geolocationMocks.request.mockResolvedValue(null)
    const wrapper = mountMap()

    await wrapper.get('[data-testid="map-nearby-toggle"]').trigger('click')
    await wrapper.get('.map-intro-dialog__enable').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-nearby-toggle"]').attributes('aria-checked')).toBe('false')
    expect(leafletMocks.divIcon).not.toHaveBeenCalledWith(expect.objectContaining({ className: 'map-user-location-marker-wrapper' }))
    expect(wrapper.get('.map-intro-dialog__error').text()).toContain('Location permission was not granted.')
  })

  it('leaves the Near me switch off when the user selects Not Now', async () => {
    const wrapper = mountMap()
    const nearbyToggle = wrapper.get('[data-testid="map-nearby-toggle"]')

    await nearbyToggle.trigger('click')
    await wrapper.get('.map-intro-dialog__not-now').trigger('click')
    await nextTick()

    expect(geolocationMocks.request).not.toHaveBeenCalled()
    expect(nearbyToggle.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('shows the introduction after sign-in even for an existing account', async () => {
    vi.useFakeTimers()
    authMocks.mapIntroPending = true
    const wrapper = mountMap()

    expect(wrapper.find('[data-testid="map-search-input"]').exists()).toBe(false)
    expect(wrapper.find('.map-zoom-control').exists()).toBe(false)
    expect(wrapper.get('.map-intro-skip').text()).toBe('Skip intro')

    await vi.advanceTimersByTimeAsync(2500)
    expect(wrapper.find('[role="dialog"]').text()).toContain('Find activities near you?')
    expect(leafletMocks.marker).toHaveBeenCalledTimes(1)
  })

  it('can skip the post-login introduction without requesting location', async () => {
    vi.useFakeTimers()
    authMocks.mapIntroPending = true
    const wrapper = mountMap()

    await wrapper.get('.map-intro-skip').trigger('click')
    await nextTick()

    expect(geolocationMocks.request).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="map-search-input"]').exists()).toBe(true)
  })

  it('reveals the real location dot and enables Near me after post-login permission', async () => {
    vi.useFakeTimers()
    authMocks.mapIntroPending = true
    geolocationMocks.request.mockImplementation(async () => {
      geolocationMocks.coords.value = { lat: 1.31, lng: 103.81 }
      return geolocationMocks.coords.value
    })
    const wrapper = mountMap()

    await vi.advanceTimersByTimeAsync(2500)
    await wrapper.get('.map-intro-dialog__enable').trigger('click')
    await vi.advanceTimersByTimeAsync(1400)

    expect(leafletMocks.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      className: 'map-user-location-marker-wrapper',
      html: expect.stringContaining('YOU ARE HERE'),
    }))
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-nearby-toggle"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-testid="map-nearby-radius"]').attributes('disabled')).toBeUndefined()
    expect(leafletMocks.circle).toHaveBeenCalledWith([1.31, 103.81], expect.objectContaining({ radius: 5000 }))
  })

  it('consumes the intro trigger so normal map navigation does not replay it', async () => {
    vi.useFakeTimers()
    authMocks.mapIntroPending = true
    const firstMap = mountMap()
    expect(firstMap.find('.map-intro-skip').exists()).toBe(true)

    firstMap.unmount()
    mountedWrappers.splice(mountedWrappers.indexOf(firstMap), 1)
    const secondMap = mountMap()
    await nextTick()

    expect(secondMap.find('.map-intro-skip').exists()).toBe(false)
    expect(secondMap.find('[data-testid="map-search-input"]').exists()).toBe(true)
  })

  it('shows a selected activity card and routes to its details from a marker click', async () => {
    const wrapper = mountMap()

    leafletMocks.markerInstances[0].handlers.click()
    await nextTick()

    const card = wrapper.get('[data-testid="selected-map-activity"]')
    expect(card.text()).toContain('Shared walk')
    expect(leafletMocks.mapInstance.flyTo).toHaveBeenCalledWith(
      expect.any(Object),
      18,
      expect.objectContaining({ duration: 1.2 }),
    )
    expect(card.get('.map-activity-card__directions').attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=1.3,103.8',
    )

    await card.get('.map-activity-card__view').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({ name: 'activity', params: { id: 'shared-1' }, query: { from: 'map' } })

    await card.get('.map-activity-card__close').trigger('click')
    expect(wrapper.find('[data-testid="selected-map-activity"]').exists()).toBe(false)
    expect(leafletMocks.mapInstance.flyTo).toHaveBeenCalledTimes(1)
  })

  it('opens a tooltip on the first mobile marker tap and the preview on the second', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(max-width: 767.98px)', addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })))
    const wrapper = mountMap()

    leafletMocks.markerInstances[0].handlers.click()
    await nextTick()
    expect(leafletMocks.markerInstances[0].openTooltip).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="selected-map-activity"]').exists()).toBe(false)

    leafletMocks.markerInstances[0].handlers.click()
    await nextTick()
    expect(wrapper.get('[data-testid="selected-map-activity"]').text()).toContain('Shared walk')
  })

  it('keeps the header badge visible while a preview shows live eligible progress', async () => {
    badgeHunt.selectTrackedBadge('trailblazer')
    const wrapper = mountMap()

    expect(wrapper.find('[data-testid="next-badge-card"]').exists()).toBe(true)

    leafletMocks.markerInstances[0].handlers.click()
    await nextTick()

    expect(wrapper.find('[data-testid="next-badge-card"]').exists()).toBe(true)
    const opportunity = wrapper.get('.map-badge-opportunity')
    expect(opportunity.text()).toContain('Trailblazer')
    expect(opportunity.text()).toContain('2/3 completed')
    expect(opportunity.text()).toContain('1 to go')

    await wrapper.get('.map-activity-card__close').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="next-badge-card"]').exists()).toBe(true)
  })

  it('replaces an in-progress flight and card when another marker is selected', async () => {
    const wrapper = mountMap()

    leafletMocks.markerInstances[0].handlers.click()
    leafletMocks.markerInstances[1].handlers.click()
    await nextTick()

    expect(leafletMocks.mapInstance.stop).toHaveBeenCalledTimes(2)
    expect(leafletMocks.mapInstance.flyTo).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="selected-map-activity"]').text()).toContain('Shared event')
    expect(leafletMocks.markerInstances[0].setZIndexOffset).toHaveBeenLastCalledWith(0)
    expect(leafletMocks.markerInstances[1].setZIndexOffset).toHaveBeenLastCalledWith(1000)
  })

  it('adds shared activity-store records to one cluster layer', () => {
    mountMap()

    expect(leafletMocks.clusterAddTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.mapInstance.on).toHaveBeenCalledWith('zoomend', expect.any(Function))
    expect(leafletMocks.addLayers).toHaveBeenCalledWith(expect.any(Array))
    expect(leafletMocks.marker).toHaveBeenCalledTimes(2)
    expect(activityMocks.loadActivities).toHaveBeenCalledTimes(1)
  })
})
