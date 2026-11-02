import { h, render } from 'vue'
import ActivityMapMarker from '@/components/map/ActivityMapMarker.vue'

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

function escapeTooltipText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]))
}

export function createActivityMarker(L, activity, { onSelect } = {}) {
  const markerContent = document.createElement('div')
  render(h(ActivityMapMarker, { activity }), markerContent)
  const icon = L.divIcon({
    className: 'gol-activity-marker-wrapper',
    html: markerContent,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  })

  const marker = L.marker([Number(activity.lat), Number(activity.lng)], { icon, title: activity.title })
  marker.__activityId = activity.id
  marker.bindTooltip?.(
    `<strong>${escapeTooltipText(activity.title || 'Activity')}</strong><span>${escapeTooltipText(activity.category || 'Activity')}</span>`,
    { className: 'gol-activity-tooltip', direction: 'top', offset: [0, -24], opacity: 1 },
  )
  // MarkerCluster temporarily removes child markers while recalculating a zoom level.
  // Keep their component mounted through that transition; consumers explicitly clean
  // these up when replacing the activity data or destroying the map.
  marker.__cleanupActivityMarker = () => render(null, markerContent)
  if (onSelect) marker.on('click', () => onSelect(activity))
  return marker
}

export function setActivityMarkerSelected(marker, selected) {
  marker?.setZIndexOffset?.(selected ? 1000 : 0)
  marker?.getElement?.()
    ?.querySelector('.gol-activity-marker')
    ?.classList.toggle('gol-activity-marker--selected', selected)
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

export function populateActivityClusterLayer(L, clusterLayer, activities = [], options) {
  clearActivityClusterLayer(clusterLayer)

  const markers = activities
    .filter(hasValidCoordinates)
    .map((activity) => createActivityMarker(L, activity, options))

  clusterLayer.__activityMarkerCleanups = markers.map((marker) => marker.__cleanupActivityMarker)
  clusterLayer.addLayers(markers)
  return markers
}
