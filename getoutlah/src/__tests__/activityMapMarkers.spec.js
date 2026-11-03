import { describe, expect, it, vi } from 'vitest'
import {
  clearActivityClusterLayer,
  createActivityClusterLayer,
  createActivityMarker,
  createClusterIcon,
  hasValidCoordinates,
  populateActivityClusterLayer,
  refreshActivityClusterEligibility,
  setActivityMarkerSelected,
} from '@/utils/activityMapMarkers'

function makeLeaflet() {
  const clearLayers = vi.fn()
  const addLayers = vi.fn()
  const marker = { bindTooltip: vi.fn(), on: vi.fn() }
  const L = {
    divIcon: vi.fn((options) => options),
    marker: vi.fn(() => marker),
    markerClusterGroup: vi.fn((options) => ({ ...options, clearLayers, addLayers })),
  }
  return { L, addLayers, clearLayers, marker }
}

describe('activity map markers', () => {
  it('accepts only activities with numeric coordinates', () => {
    expect(hasValidCoordinates({ lat: 1.3, lng: 103.8 })).toBe(true)
    expect(hasValidCoordinates({ lat: 'invalid', lng: 103.8 })).toBe(false)
    expect(hasValidCoordinates({ lat: 1.3 })).toBe(false)
  })

  it('creates a category marker and selects its activity when clicked', () => {
    const { L, marker } = makeLeaflet()
    const onSelect = vi.fn()
    const activity = {
      id: 'pottery-jam',
      title: 'Pottery jam OPENJIO',
      category: 'workshops',
      cost: 45,
      duration: 120,
      lat: 1.2966,
      lng: 103.8497,
    }
    createActivityMarker(L, activity, { onSelect })

    expect(L.marker).toHaveBeenCalledWith([1.2966, 103.8497], expect.any(Object))
    expect(marker.bindTooltip).toHaveBeenCalledWith(
      expect.stringContaining('Pottery jam OPENJIO'),
      expect.objectContaining({ direction: 'top', className: 'gol-activity-tooltip' }),
    )
    expect(marker.on).toHaveBeenCalledWith('click', expect.any(Function))
    marker.on.mock.calls[0][1]()
    expect(onSelect).toHaveBeenCalledWith(activity)
    const markerIcon = L.divIcon.mock.calls[0][0]
    expect(markerIcon.html.innerHTML).toContain('🏺')
    expect(markerIcon.html.innerHTML).toContain('--activity-color: #FFC976')
  })

  it('clears and repopulates a cluster layer while skipping invalid activities', () => {
    const { L, addLayers, clearLayers } = makeLeaflet()
    const layer = createActivityClusterLayer(L)
    const markers = populateActivityClusterLayer(L, layer, [
      { id: 'valid', title: 'Walk', category: 'outdoors', cost: 0, duration: 60, lat: 1.3, lng: 103.8 },
      { id: 'invalid', title: 'Missing place', category: 'arts', cost: 0, duration: 60, lat: null, lng: null },
    ])

    expect(clearLayers).toHaveBeenCalledTimes(1)
    expect(markers).toHaveLength(1)
    expect(addLayers).toHaveBeenCalledWith(markers)
  })

  it('does not unmount marker components during Leaflet cluster zoom transitions', () => {
    const { L } = makeLeaflet()
    const marker = createActivityMarker(L, {
      title: 'Walk', category: 'outdoors', cost: 0, duration: 60, lat: 1.3, lng: 103.8,
    })

    expect(marker.__cleanupActivityMarker).toEqual(expect.any(Function))
    expect(marker.on).not.toHaveBeenCalled()
  })

  it('adds and removes the selected marker state without rebuilding markers', () => {
    const element = document.createElement('div')
    const markerElement = document.createElement('div')
    markerElement.className = 'gol-activity-marker'
    element.append(markerElement)
    const marker = { getElement: () => element }

    setActivityMarkerSelected(marker, true)
    expect(markerElement.classList).toContain('gol-activity-marker--selected')

    setActivityMarkerSelected(marker, false)
    expect(markerElement.classList).not.toContain('gol-activity-marker--selected')
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

  it('marks a mixed cluster as eligible without changing its activity count', () => {
    const { L } = makeLeaflet()
    const icon = createClusterIcon(L, {
      getChildCount: () => 7,
      getAllChildMarkers: () => [{ __activity: { category: 'arts' } }, { __activity: { category: 'outdoors' } }],
    }, (activity) => activity.category === 'outdoors')

    expect(icon.html).toContain('gol-cluster-marker--hunt')
    expect(icon.html).toContain('>7<')
  })

  it('refreshes cluster icons when Badge Hunt eligibility changes', () => {
    const layer = { refreshClusters: vi.fn() }
    const eligible = vi.fn()
    refreshActivityClusterEligibility(layer, eligible)
    expect(layer.__isHuntEligible).toBe(eligible)
    expect(layer.refreshClusters).toHaveBeenCalledOnce()
  })

})
