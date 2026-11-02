export const ACTIVITY_FOCUS_ZOOM = 18

const STILL_DISTANCE_PX = 12
const NEAR_VIEWPORT_RATIO = 0.18

function coordinatesFor(activity) {
  const lat = Number(activity?.lat)
  const lng = Number(activity?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

export function getActivityFocusTarget(map, activity, { isMobile = false, targetZoom = ACTIVITY_FOCUS_ZOOM } = {}) {
  const coordinates = coordinatesFor(activity)
  if (!map || !coordinates) return null

  const size = map.getSize()
  const zoom = Math.max(map.getZoom(), targetZoom)
  // On compact screens, reserve the lower portion of the map for the preview card.
  const desiredPosition = { x: size.x / 2, y: size.y * (isMobile ? 0.4 : 0.5) }
  const activityPoint = map.project(coordinates, zoom)
  const centrePoint = [
    activityPoint.x - desiredPosition.x + (size.x / 2),
    activityPoint.y - desiredPosition.y + (size.y / 2),
  ]
  const containerPoint = map.latLngToContainerPoint(coordinates)
  const distance = Math.hypot(containerPoint.x - desiredPosition.x, containerPoint.y - desiredPosition.y)
  const minDimension = Math.min(size.x, size.y)

  return {
    centre: map.unproject(centrePoint, zoom),
    distance,
    isNear: map.getZoom() >= zoom - 1 && distance <= minDimension * NEAR_VIEWPORT_RATIO,
    isStill: map.getZoom() === zoom && distance <= STILL_DISTANCE_PX,
    zoom,
  }
}

export function focusMapOnActivity(map, activity, options = {}) {
  const target = getActivityFocusTarget(map, activity, options)
  if (!target || target.isStill) return { moved: false, target }

  map.stop?.()
  if (options.reducedMotion) {
    map.setView(target.centre, target.zoom, { animate: false })
    return { moved: true, target }
  }

  map.flyTo(target.centre, target.zoom, {
    animate: true,
    duration: target.isNear ? 0.65 : 1.2,
  })
  return { moved: true, target }
}
