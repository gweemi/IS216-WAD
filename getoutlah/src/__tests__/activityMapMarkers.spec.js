import { describe, expect, it, vi } from 'vitest'
import {
  clearActivityClusterLayer,
  createActivityClusterLayer,
  createActivityMarker,
  createClusterIcon,
  hasValidCoordinates,
  populateActivityClusterLayer,
} from '@/utils/activityMapMarkers'

function makeLeaflet() {
  const clearLayers = vi.fn()
  const addLayers = vi.fn()
  const bindPopup = vi.fn()
  const marker = { bindPopup, on: vi.fn() }
  bindPopup.mockReturnValue(marker)
  const L = {
    divIcon: vi.fn((options) => options),
    marker: vi.fn(() => marker),
    markerClusterGroup: vi.fn((options) => ({ ...options, clearLayers, addLayers })),
  }
  return { L, addLayers, bindPopup, clearLayers }
}

describe('activity map markers', () => {
  it('accepts only activities with numeric coordinates', () => {
    expect(hasValidCoordinates({ lat: 1.3, lng: 103.8 })).toBe(true)
    expect(hasValidCoordinates({ lat: 'invalid', lng: 103.8 })).toBe(false)
    expect(hasValidCoordinates({ lat: 1.3 })).toBe(false)
  })

  it('creates a category marker with activity popup details', () => {
    const { L, bindPopup } = makeLeaflet()
    createActivityMarker(L, {
      title: 'Pottery jam OPENJIO',
      category: 'workshops',
      cost: 45,
      duration: 120,
      lat: 1.2966,
      lng: 103.8497,
    })

    expect(L.marker).toHaveBeenCalledWith([1.2966, 103.8497], expect.any(Object))
    expect(bindPopup).toHaveBeenCalledWith(expect.stringContaining('S$45 · 120 min'))
    const markerIcon = L.divIcon.mock.calls[0][0]
    expect(markerIcon.html.innerHTML).toContain('bi-paintbrush')
    expect(markerIcon.html.innerHTML).toContain('--activity-color: #FFC976')
  })

  it('clears and repopulates a cluster layer while skipping invalid activities', () => {
    const { L, addLayers, clearLayers } = makeLeaflet()
    const layer = createActivityClusterLayer(L)
    const markers = populateActivityClusterLayer(L, layer, [
      { id: 'valid', title: 'Walk', category: 'nature', cost: 0, duration: 60, lat: 1.3, lng: 103.8 },
      { id: 'invalid', title: 'Missing place', category: 'arts', cost: 0, duration: 60, lat: null, lng: null },
    ])

    expect(clearLayers).toHaveBeenCalledTimes(1)
    expect(markers).toHaveLength(1)
    expect(addLayers).toHaveBeenCalledWith(markers)
  })

  it('does not unmount marker components during Leaflet cluster zoom transitions', () => {
    const { L } = makeLeaflet()
    const marker = createActivityMarker(L, {
      title: 'Walk', category: 'nature', cost: 0, duration: 60, lat: 1.3, lng: 103.8,
    })

    expect(marker.__cleanupActivityMarker).toEqual(expect.any(Function))
    expect(marker.on).not.toHaveBeenCalled()
  })

  it('cleans up marker components only when their cluster layer is explicitly cleared', () => {
    const { L, clearLayers } = makeLeaflet()
    const layer = createActivityClusterLayer(L)
    const cleanup = vi.fn()
    layer.__activityMarkerCleanups = [cleanup]

    clearActivityClusterLayer(layer)

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(clearLayers).toHaveBeenCalledTimes(1)
  })

  it('creates a cluster icon with the exact child-marker count', () => {
    const { L } = makeLeaflet()
    const icon = createClusterIcon(L, { getChildCount: () => 7 })

    expect(icon.html).toContain('>7<')
    expect(icon.html).toContain('7 activities')
  })

  it('uses neutral text for unknown price and duration', () => {
    const { L, bindPopup } = makeLeaflet()
    createActivityMarker(L, {
      title: 'Demo: Food festival', category: 'food', cost: null, duration: null, lat: 1.28, lng: 103.85,
    })

    expect(bindPopup).toHaveBeenCalledWith(expect.stringContaining('Price TBC · Duration TBC'))
  })
})
