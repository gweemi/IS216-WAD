import { h, render } from 'vue'
import ActivityMapMarker from '@/components/map/ActivityMapMarker.vue'
import { MAP_ACTIVITY_CATEGORY_FALLBACK, getMapActivityCategory } from '@/config/mapActivityCategories'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character])
}

function formatCost(cost) {
  if (cost === null || cost === undefined || !Number.isFinite(Number(cost))) return 'Price TBC'
  return Number(cost) === 0 ? 'Free' : `S$${Number(cost)}`
}

function formatDuration(duration) {
  if (duration === null || duration === undefined || !Number.isFinite(Number(duration))) return 'Duration TBC'
  return `${Number(duration)} min`
}

export function hasValidCoordinates(activity) {
  return (
    activity?.lat !== null &&
    activity?.lat !== '' &&
    activity?.lng !== null &&
    activity?.lng !== '' &&
    Number.isFinite(Number(activity?.lat)) &&
    Number.isFinite(Number(activity?.lng))
  )
}

export function createActivityMarker(L, activity) {
  const category = getMapActivityCategory(activity.category) ?? MAP_ACTIVITY_CATEGORY_FALLBACK
  const markerContent = document.createElement('div')
  render(h(ActivityMapMarker, { activity }), markerContent)
  const icon = L.divIcon({
    className: 'gol-activity-marker-wrapper',
    html: markerContent,
    iconSize: [58, 58],
    iconAnchor: [29, 29],
    popupAnchor: [0, -31],
  })

  const marker = L.marker([Number(activity.lat), Number(activity.lng)], { icon, title: activity.title })
  // MarkerCluster temporarily removes child markers while recalculating a zoom level.
  // Keep their component mounted through that transition; consumers explicitly clean
  // these up when replacing the activity data or destroying the map.
  marker.__cleanupActivityMarker = () => render(null, markerContent)

  marker.bindPopup(`
    <section class="gol-activity-popup">
      <strong>${escapeHtml(activity.title)}</strong>
      <span>${escapeHtml(category.label)}</span>
      <span>${escapeHtml(formatCost(activity.cost))} · ${escapeHtml(formatDuration(activity.duration))}</span>
    </section>
  `)
  return marker
}

export function createClusterIcon(L, cluster) {
  const count = cluster.getChildCount()

  return L.divIcon({
    className: 'gol-cluster-marker-wrapper',
    html: `
      <div class="gol-cluster-marker" aria-label="${count} activities">
        <span class="gol-cluster-marker__layer gol-cluster-marker__layer--back"></span>
        <span class="gol-cluster-marker__layer gol-cluster-marker__layer--middle"></span>
        <span class="gol-cluster-marker__front"><i class="bi bi-map" aria-hidden="true"></i></span>
        <span class="gol-cluster-marker__count">${count}</span>
      </div>
    `,
    iconSize: [62, 62],
    iconAnchor: [31, 31],
  })
}

export function createActivityClusterLayer(L) {
  return L.markerClusterGroup({
    animate: true,
    maxClusterRadius: 60,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster) => createClusterIcon(L, cluster),
  })
}

export function clearActivityClusterLayer(clusterLayer) {
  clusterLayer.__activityMarkerCleanups?.forEach((cleanup) => cleanup())
  clusterLayer.__activityMarkerCleanups = []
  clusterLayer.clearLayers()
}

export function populateActivityClusterLayer(L, clusterLayer, activities = []) {
  clearActivityClusterLayer(clusterLayer)

  const markers = activities
    .filter(hasValidCoordinates)
    .map((activity) => createActivityMarker(L, activity))

  clusterLayer.__activityMarkerCleanups = markers.map((marker) => marker.__cleanupActivityMarker)
  clusterLayer.addLayers(markers)
  return markers
}
