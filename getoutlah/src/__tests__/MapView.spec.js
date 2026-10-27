import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MapView from '@/views/MapView.vue'

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

  it('adds the map demo activities to one cluster layer', () => {
    mount(MapView)

    expect(leafletMocks.clusterAddTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.zoomControlAddTo).toHaveBeenCalledTimes(1)
    expect(leafletMocks.addLayers).toHaveBeenCalledWith(expect.any(Array))
    expect(leafletMocks.marker).toHaveBeenCalledTimes(20)
  })
})
