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

function titleCaseCategory(value) {
  return String(value ?? 'Activity')
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

export function createActivityMarker(L, activity, { onSelect, isHuntEligible } = {}) {
  const markerContent = document.createElement('div')
  render(h(ActivityMapMarker, { activity, huntEligible: Boolean(isHuntEligible?.(activity)) }), markerContent)
  const icon = L.divIcon({
    className: 'gol-activity-marker-wrapper',
    html: markerContent,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  })

  const marker = L.marker([Number(activity.lat), Number(activity.lng)], { icon, title: activity.title })
  marker.__activityId = activity.id
  marker.__activity = activity
  marker.bindTooltip?.(
    `<strong>${escapeTooltipText(activity.title || 'Activity')}</strong><span>${escapeTooltipText(titleCaseCategory(activity.category))}</span>`,
    { className: 'gol-activity-tooltip', direction: 'top', offset: [0, -24], opacity: 1 },
  )
  // MarkerCluster temporarily removes child markers while recalculating a zoom level.
  // Keep their component mounted through that transition; consumers explicitly clean
  // these up when replacing the activity data or destroying the map.
  marker.__cleanupActivityMarker = () => render(null, markerContent)
  if (onSelect) marker.on('click', () => onSelect(activity))
  return marker
}

export function setActivityMarkerHuntEligible(marker, eligible, { animate = false } = {}) {
  const element = marker?.getElement?.()?.querySelector('.gol-activity-marker')
  if (!element) return
  element.classList.toggle('gol-activity-marker--hunt', eligible)
  element.classList.remove('gol-activity-marker--hunt-animate')
}

export function setActivityMarkerSelected(marker, selected) {
  marker?.setZIndexOffset?.(selected ? 1000 : 0)
  marker?.getElement?.()
    ?.querySelector('.gol-activity-marker')
    ?.classList.toggle('gol-activity-marker--selected', selected)
}

export function createClusterIcon(L, cluster, isHuntEligible) {
  const count = cluster.getChildCount()
  const eligible = cluster.getAllChildMarkers?.().some((marker) => isHuntEligible?.(marker.__activity))

  return L.divIcon({
    className: 'gol-cluster-marker-wrapper',
    html: `
      <div class="gol-cluster-marker${eligible ? ' gol-cluster-marker--hunt' : ''}" aria-label="${count} activities">
        <div class="gol-cluster-marker__inner">
        <span class="gol-cluster-marker__layer gol-cluster-marker__layer--back"></span>
        <span class="gol-cluster-marker__layer gol-cluster-marker__layer--middle"></span>
        <span class="gol-cluster-marker__front"><i class="bi bi-map" aria-hidden="true"></i></span>
        <span class="gol-cluster-marker__count">${count}</span>
        </div>
      </div>
    `,
    iconSize: [62, 62],
    iconAnchor: [31, 31],
  })
}

export function createActivityClusterLayer(L, { isHuntEligible } = {}) {
  const layer = L.markerClusterGroup({
    animate: true,
    maxClusterRadius: 60,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster) => createClusterIcon(L, cluster, layer.__isHuntEligible),
  })
  layer.__isHuntEligible = isHuntEligible
  return layer
}

export function refreshActivityClusterEligibility(clusterLayer, isHuntEligible) {
  if (!clusterLayer) return
  clusterLayer.__isHuntEligible = isHuntEligible
  clusterLayer.refreshClusters?.()
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
