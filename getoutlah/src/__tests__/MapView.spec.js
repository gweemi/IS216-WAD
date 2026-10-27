import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const leafletMocks = vi.hoisted(() => ({
  addLayers: vi.fn(),
  addTo: vi.fn(),
  clearLayers: vi.fn(),
  clusterAddTo: vi.fn(),
  divIcon: vi.fn(),
  marker: vi.fn(() => ({ bindPopup: vi.fn() })),
  remove: vi.fn(),
  setView: vi.fn(),
  zoomControlAddTo: vi.fn(),
}))

const activityMocks = vi.hoisted(() => ({
  items: [
    {
      id: 'shared-1',
      title: 'Shared walk',
      category: 'outdoors',
      cost: 0,
      durationHrs: 1,
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
    },
  ],
  loadActivities: vi.fn(),
}))

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({ setView: leafletMocks.setView, remove: leafletMocks.remove })),
    tileLayer: vi.fn(() => ({ addTo: leafletMocks.addTo })),
    markerClusterGroup: vi.fn(() => ({
      addTo: leafletMocks.clusterAddTo,
      clearLayers: leafletMocks.clearLayers,
      addLayers: leafletMocks.addLayers,
    })),
    marker: leafletMocks.marker,
    divIcon: leafletMocks.divIcon,
    control: {
      zoom: vi.fn(() => ({ addTo: leafletMocks.zoomControlAddTo })),
    },
  },
}))

vi.mock('leaflet.markercluster', () => ({}))
vi.mock('@/stores/activities', async () => {
  const { ref } = await import('vue')

  return {
    allActivities: ref(activityMocks.items),
    loadActivities: activityMocks.loadActivities,
  }
})

const { default: MapView } = await import('@/views/MapView.vue')

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the visual search and filter controls', () => {
    const wrapper = mount(MapView)

    expect(wrapper.get('[data-testid="map-search-input"]').attributes('placeholder')).toBe(
      'Search activities, places...',
    )
    expect(wrapper.get('[data-testid="map-filter-button"]').attributes('aria-label')).toBe(
      'Open activity filters',
    )
  })

  it('adds shared activity-store records to one cluster layer', () => {
    mount(MapView)

    expect(leafletMocks.clusterAddTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.zoomControlAddTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.addLayers).toHaveBeenCalledWith(expect.any(Array))
    expect(leafletMocks.marker).toHaveBeenCalledTimes(activityMocks.items.length)
    expect(activityMocks.loadActivities).toHaveBeenCalledTimes(1)
  })
})
