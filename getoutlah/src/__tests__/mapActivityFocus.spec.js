import { describe, expect, it, vi } from 'vitest'
import { ACTIVITY_FOCUS_ZOOM, focusMapOnActivity, getActivityFocusTarget } from '@/utils/mapActivityFocus'

function makeMap({ zoom = 12, point = { x: 120, y: 100 } } = {}) {
  return {
    flyTo: vi.fn(),
    getSize: () => ({ x: 1000, y: 800 }),
    getZoom: () => zoom,
    latLngToContainerPoint: () => point,
    project: ([lat, lng]) => ({ x: lng * 1000, y: lat * 1000 }),
    setView: vi.fn(),
    stop: vi.fn(),
    unproject: ([x, y], targetZoom) => ({ x, y, targetZoom }),
  }
}

const activity = { lat: 1.3, lng: 103.8 }

describe('map activity focus', () => {
  it('centres desktop selections at zoom 18', () => {
    const target = getActivityFocusTarget(makeMap(), activity)

    expect(target.zoom).toBe(ACTIVITY_FOCUS_ZOOM)
    expect(target.centre).toMatchObject({ x: 103800, y: 1300, targetZoom: 18 })
  })

  it('frames mobile selections in the upper visible map area', () => {
    const target = getActivityFocusTarget(makeMap(), activity, { isMobile: true })

    expect(target.centre).toMatchObject({ x: 103800, y: 1380, targetZoom: 18 })
  })

  it('uses a full flight for distant activities', () => {
    const map = makeMap()
    focusMapOnActivity(map, activity)

    expect(map.stop).toHaveBeenCalledOnce()
    expect(map.flyTo).toHaveBeenCalledWith(expect.any(Object), 18, expect.objectContaining({ duration: 1.2 }))
  })

  it('uses a shorter flight for nearby activities at an already-close zoom', () => {
    const map = makeMap({ zoom: 17, point: { x: 500, y: 400 } })
    focusMapOnActivity(map, activity)

    expect(map.flyTo).toHaveBeenCalledWith(expect.any(Object), 18, expect.objectContaining({ duration: 0.65 }))
  })

  it('does not move an already-centred activity at the target zoom', () => {
    const map = makeMap({ zoom: 18, point: { x: 500, y: 400 } })
    const result = focusMapOnActivity(map, activity)

    expect(result.moved).toBe(false)
    expect(map.stop).not.toHaveBeenCalled()
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it('uses an immediate setView for reduced motion', () => {
    const map = makeMap()
    focusMapOnActivity(map, activity, { reducedMotion: true })

    expect(map.setView).toHaveBeenCalledWith(expect.any(Object), 18, { animate: false })
    expect(map.flyTo).not.toHaveBeenCalled()
  })
})
