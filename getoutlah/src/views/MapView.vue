<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { allActivities, filtered, filters, loadActivities, oneCardPerEvent, weatherAt } from '@/stores/activities'
import { useGeolocation } from '@/composables/useGeolocation'
import { useMapIntroState } from '@/composables/useMapIntroState'
import { useAuthStore } from '@/stores/auth'
import { INTERESTS } from '@/config/preferences'
import { REGIONS } from '@/config/regions'
import { clearActivityClusterLayer, createActivityClusterLayer, populateActivityClusterLayer, refreshActivityClusterEligibility, setActivityMarkerSelected, setActivityMarkerHuntEligible } from '@/utils/activityMapMarkers'
import { focusMapOnActivity } from '@/utils/mapActivityFocus'
import { directionsUrl } from '@/services/maps'
import { categoryColor, categoryEmoji, categoryLabel, priceText } from '@/utils/activityStyle'
import { isNparksRoute } from '@/utils/nparksTrails'
import { getNparksRoute } from '@/services/api/nparks'
import { distanceMeters } from '@/utils/geo'
import { badgeOpportunities, canActivityProgressBadge } from '@/stores/gamification(badges).js'
import { useBadgeHunt } from '@/composables/useBadgeHunt'
import BadgeHuntSheet from '@/components/badges/BadgeHuntSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const { setMapIntroActive } = useMapIntroState()
const { trackedBadgeId, trackedBadge, selectTrackedBadge } = useBadgeHunt()
const mapElement = ref(null)
const filtersOpen = ref(false)
const categorySelectorExpanded = ref(false)
let categorySelectorAnimationFrame
let categorySelectorAutoOpened = false
const activeMobileTooltipId = ref(null)
const huntSheetOpen = ref(false)
const selectedHuntId = ref(null)
const selectedActivity = ref(null)
const selectedImageBroken = ref(false)
const nearMeEnabled = ref(false)
const nearbyRadiusKm = ref(5)
const onboardingStage = ref('checkingEligibility')
const onboardingMessage = ref('')
const discoveryStep = ref(0)
const introEnableButton = ref(null)
const nearbyPromptOpen = ref(false)
const nearbyPromptMessage = ref('')
const nearbyEnableButton = ref(null)
const { coords: locationCoords, error: locationError, loading: locationLoading, request: requestLocation, clear: clearLocation } = useGeolocation()
const onboardingEligible = Boolean(auth.isLoggedIn && auth.consumeMapIntro())
if (!onboardingEligible) onboardingStage.value = 'completed'
const onboardingActive = computed(() => onboardingStage.value !== 'completed')
const showActivityMarkers = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 1)
const showHeader = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 2)
const showDiscoveryControls = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 3)
const showMapControls = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 4)
const allDiscoverableActivities = computed(() => oneCardPerEvent(allActivities.value))
const allMapActivities = computed(() => oneCardPerEvent(filtered.value))
const activities = computed(() => !nearMeEnabled.value || !locationCoords.value
  ? allMapActivities.value
  : allMapActivities.value.filter((activity) => activity.lat != null && activity.lng != null && distanceMeters(locationCoords.value, activity) <= nearbyRadiusKm.value * 1000))
const recommendedBadgeOpportunities = computed(() => badgeOpportunities(allDiscoverableActivities.value))
const visibleHuntOpportunities = computed(() => badgeOpportunities(activities.value))
const activeHuntOpportunity = computed(() => visibleHuntOpportunities.value.find((badge) => badge.id === trackedBadgeId.value) ?? null)
const huntLocationText = computed(() => {
  if (!trackedBadge.value) return ''
  if (!nearMeEnabled.value) return 'Showing all eligible activities · Turn on Near Me to focus nearby'
  const count = activeHuntOpportunity.value?.eligibleActivities.length ?? 0
  return count ? `${count} nearby within ${nearbyRadiusKm.value} km` : `No nearby matches within ${nearbyRadiusKm.value} km`
})
const selectedBadgeOpportunity = computed(() => selectedActivity.value && trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, selectedActivity.value) ? trackedBadge.value : null)
const categories = computed(() => [{ id: 'all', label: 'All', emoji: '✦', color: '#7541EC' }, ...INTERESTS])
const selectedCategories = computed(() => categories.value.filter((category) =>
  category.id !== 'all' && filters.value.categories.includes(category.id),
))
const categoryMenuLabel = computed(() => {
  if (selectedCategories.value.length > 1) return `${selectedCategories.value.length} Categories`
  return selectedCategories.value[0]?.label ?? 'All Categories'
})
const selectedWeather = computed(() => selectedActivity.value ? weatherAt(selectedActivity.value) : null)
const selectedImage = computed(() => selectedActivity.value?.imageLargeUrl ?? selectedActivity.value?.imageUrl ?? null)
const selectedDescription = computed(() => {
  const text = selectedActivity.value?.description?.trim() ?? ''
  return text.length > 130 ? `${text.slice(0, 127).trimEnd()}…` : text
})
const selectedDirections = computed(() => selectedActivity.value?.lat != null && selectedActivity.value?.lng != null
  ? directionsUrl(selectedActivity.value.lat, selectedActivity.value.lng)
  : null)
const MIN_MAP_ZOOM = 11
const MAX_MAP_ZOOM = 18
const mapZoom = ref(12)
const showDesktopZoomControl = ref(typeof window === 'undefined' ? true : !isMobileViewport())
let map
let clusterLayer
let userLocationMarker
let nearbyRadiusCircle
let temporaryLocationMarker
let activityMarkers = new Map()
let locationRequestId = 0
let onboardingRunId = 0
let tileReadyTimer
let tileLayer
let trailLayer
const showingTrail = ref(false)
const selectedRoute = ref(null)
const trailLoadState = ref('idle')
const trailLoadError = ref('')
let trailLoadRequest = 0
const selectedIsNparksRoute = computed(() => isNparksRoute(selectedActivity.value))
const canShowSelectedTrail = computed(() => selectedIsNparksRoute.value && trailLoadState.value === 'ready' && !!selectedRoute.value?.features?.length)

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function waitFor(ms, runId) {
  if (prefersReducedMotion() || ms === 0) return Promise.resolve(onboardingRunId === runId)
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(onboardingRunId === runId), ms)
    // A run-id makes old timers harmless; retaining the timer is unnecessary once
    // its callback fires, but keeping it allows unmount to stop the tile fallback.
    if (runId === onboardingRunId) tileReadyTimer = timer
  })
}

function removeTemporaryLocationMarker() {
  if (temporaryLocationMarker && map) map.removeLayer(temporaryLocationMarker)
  temporaryLocationMarker = null
}

function showTemporaryLocationMarker() {
  if (!map) return
  removeTemporaryLocationMarker()
  temporaryLocationMarker = L.marker([1.3521, 103.8198], {
    icon: L.divIcon({
      className: 'map-intro-marker-wrapper',
      html: '<span class="map-intro-marker" aria-hidden="true"><i class="bi bi-geo-alt-fill"></i></span>',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    }),
    interactive: false,
    keyboard: false,
  }).addTo(map)
}

function revealDiscovery() {
  const runId = onboardingRunId
  onboardingStage.value = 'discoveryReveal'
  discoveryStep.value = 1
  renderActivityMarkers(activities.value)

  Promise.resolve()
    .then(() => waitFor(220, runId))
    .then((current) => {
      if (!current) return false
      discoveryStep.value = 2
      return waitFor(220, runId)
    })
    .then((current) => {
      if (!current) return false
      discoveryStep.value = 3
      return waitFor(220, runId)
    })
    .then((current) => {
      if (!current) return
      discoveryStep.value = 4
      onboardingStage.value = 'completed'
      setMapIntroActive(false)
    })
}

function finishLocationChoice(coords = null) {
  removeTemporaryLocationMarker()
  if (coords) {
    onboardingStage.value = 'locationReveal'
    // Choosing Enable Location during the introduction is an explicit choice to
    // discover nearby activities, using the same default radius as the normal UI.
    enableNearby(coords, { pulse: true, panToLocation: true })
  }
  const runId = onboardingRunId
  Promise.resolve(waitFor(coords ? 650 : 180, runId)).then((current) => {
    if (current) revealDiscovery()
  })
}

async function enableOnboardingLocation() {
  if (onboardingStage.value !== 'locationPrompt') return
  const requestId = ++locationRequestId
  const runId = onboardingRunId
  onboardingStage.value = 'locatingUser'
  const coords = await requestLocation()
  if (requestId !== locationRequestId || runId !== onboardingRunId) return
  if (!coords) onboardingMessage.value = locationError.value || 'Location is unavailable, but you can still explore Singapore.'
  finishLocationChoice(coords)
}

function declineOnboardingLocation() {
  if (onboardingStage.value !== 'locationPrompt') return
  finishLocationChoice()
}

function skipOnboarding() {
  if (!onboardingActive.value) return
  onboardingRunId += 1
  locationRequestId += 1
  removeTemporaryLocationMarker()
  discoveryStep.value = 4
  onboardingStage.value = 'completed'
  renderActivityMarkers(activities.value)
  setMapIntroActive(false)
}

async function startOnboarding() {
  const runId = ++onboardingRunId
  onboardingStage.value = 'introMap'
  setMapIntroActive(true)
  await waitFor(800, runId)
  if (runId !== onboardingRunId) return
  onboardingStage.value = 'introMarker'
  showTemporaryLocationMarker()
  const current = await waitFor(500, runId)
  if (current) onboardingStage.value = 'locationPrompt'
}

function isMobileViewport() {
  return window.matchMedia?.('(max-width: 767.98px)').matches ?? false
}

function updateResponsiveMapControls() {
  showDesktopZoomControl.value = !isMobileViewport()
}

function syncMapZoom() {
  if (map) mapZoom.value = map.getZoom()
}

function setMapZoom(event) {
  const zoom = Number(event.target.value)
  mapZoom.value = zoom
  if (map) map.setZoom(zoom, { animate: !prefersReducedMotion() })
}

function removeUserLocationMarker() {
  if (userLocationMarker && map) map.removeLayer(userLocationMarker)
  userLocationMarker = null
}

function removeNearbyRadiusCircle() {
  if (nearbyRadiusCircle && map) map.removeLayer(nearbyRadiusCircle)
  nearbyRadiusCircle = null
}

function updateNearbyRadiusCircle() {
  if (!map || !nearMeEnabled.value || !locationCoords.value) {
    removeNearbyRadiusCircle()
    return
  }

  const center = [locationCoords.value.lat, locationCoords.value.lng]
  const radius = nearbyRadiusKm.value * 1000
  if (!nearbyRadiusCircle) {
    nearbyRadiusCircle = L.circle(center, {
      radius,
      color: '#7541EC',
      weight: 2,
      opacity: .6,
      fillColor: '#7541EC',
      fillOpacity: .08,
      interactive: false,
    }).addTo(map)
    return
  }
  nearbyRadiusCircle.setLatLng(center)
  nearbyRadiusCircle.setRadius(radius)
}

function showUserLocation(coords, { pulse = false, panToLocation = false } = {}) {
  if (!map || !coords) return
  removeUserLocationMarker()
  userLocationMarker = L.marker([coords.lat, coords.lng], {
    icon: L.divIcon({
      className: 'map-user-location-marker-wrapper',
      html: `
        <div class="map-user-location-marker${pulse ? ' map-user-location-marker--intro' : ''}" aria-label="You are here">
          <span class="map-user-location-marker__label">YOU ARE HERE</span>
          <span class="map-user-location-marker__pin"><i class="bi bi-map-pin-fill" aria-hidden="true"></i></span>
        </div>
      `,
      iconSize: [116, 64],
      iconAnchor: [58, 58],
    }),
    interactive: false,
    keyboard: false,
  })
  userLocationMarker.addTo(map)
  const location = [coords.lat, coords.lng]
  const isVisible = map.getBounds?.().contains?.(location) ?? false
  if (panToLocation && !isVisible) {
    map.panTo(location, { animate: !prefersReducedMotion(), duration: .75 })
  }
}

function enableNearby(coords, { panToLocation = true, pulse = false } = {}) {
  nearMeEnabled.value = true
  showUserLocation(coords, { panToLocation, pulse })
  updateNearbyRadiusCircle()
}

function toggleNearby() {
  if (nearMeEnabled.value) {
    disableNearby()
    return
  }

  if (locationCoords.value) {
    enableNearby(locationCoords.value)
    return
  }

  nearbyPromptMessage.value = ''
  nearbyPromptOpen.value = true
}

function setNearbyRadius(event) {
  nearbyRadiusKm.value = Number(event.target.value)
  updateNearbyRadiusCircle()
}

async function confirmNearbyLocation() {
  const requestId = ++locationRequestId
  const coords = await requestLocation()
  if (requestId !== locationRequestId) return
  if (!coords) {
    nearbyPromptMessage.value = locationError.value || 'Location is unavailable. You can still explore Singapore.'
    return
  }

  enableNearby(coords)
  nearbyPromptOpen.value = false
}

function declineNearbyLocation() {
  locationRequestId += 1
  nearMeEnabled.value = false
  nearbyPromptOpen.value = false
  nearbyPromptMessage.value = ''
  clearLocation()
}

function disableNearby() {
  locationRequestId += 1
  nearMeEnabled.value = false
  // Keep the verified coordinate in this Map session so turning the filter back
  // on does not request permission again. It is never persisted.
  removeNearbyRadiusCircle()
  removeUserLocationMarker()
}

function handleMarkerSelect(activity) {
  if (!isMobileViewport()) {
    selectActivity(activity)
    return
  }
  const marker = activityMarkers.get(activity.id)
  if (activeMobileTooltipId.value === activity.id) {
    marker?.closeTooltip?.()
    activeMobileTooltipId.value = null
    selectActivity(activity)
    return
  }
  activityMarkers.get(activeMobileTooltipId.value)?.closeTooltip?.()
  activeMobileTooltipId.value = activity.id
  marker?.openTooltip?.()
}

function renderActivityMarkers(items) {
  if (!clusterLayer || !showActivityMarkers.value) return
  const markers = populateActivityClusterLayer(L, clusterLayer, items, {
    onSelect: handleMarkerSelect,
    isHuntEligible: (activity) => Boolean(trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, activity)),
  })
  activityMarkers = new Map(markers.map((marker) => [marker.__activityId, marker]))
  if (selectedActivity.value) setActivityMarkerSelected(activityMarkers.get(selectedActivity.value.id), true)
}

function refreshHuntMarkers(animate = false) {
  applyHuntStateToMarkers([...activityMarkers.values()], animate)
  refreshActivityClusterEligibility(clusterLayer, (activity) => Boolean(trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, activity)))
}

function applyHuntStateToMarkers(markers, animate = false) {
  markers.forEach((marker) => {
    const activity = marker.__activity ?? activities.value.find((item) => item.id === marker.__activityId)
    setActivityMarkerHuntEligible(marker, Boolean(activity && trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, activity)), { animate })
  })
}

// MarkerCluster inserts the individual marker DOM only after spiderfying/zooming.
// Reapply the inner marker class on its lifecycle frame so Leaflet's outer
// coordinate transform remains untouched while eligible children keep bouncing.
function syncHuntAfterClusterLifecycle(event = {}) {
  requestAnimationFrame(() => {
    applyHuntStateToMarkers(event.markers?.length ? event.markers : [...activityMarkers.values()])
    refreshActivityClusterEligibility(clusterLayer, (activity) => Boolean(trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, activity)))
  })
}

function openHuntSelector() {
  selectedHuntId.value = trackedBadgeId.value ?? recommendedBadgeOpportunities.value[0]?.id ?? null
  huntSheetOpen.value = true
}
function selectRecommendedBadge(id) {
  if (!id) return
  selectTrackedBadge(id)
  selectedHuntId.value = id
  huntSheetOpen.value = false
}

function ensureRecommendedBadge() {
  const opportunities = recommendedBadgeOpportunities.value
  if (!opportunities.length) {
    if (trackedBadgeId.value) selectTrackedBadge(null)
    return
  }
  if (!trackedBadgeId.value || !opportunities.some((badge) => badge.id === trackedBadgeId.value)) {
    selectTrackedBadge(opportunities[0].id)
  }
}

function maybeOpenBadgeWelcome() {
  if (onboardingActive.value || selectedActivity.value || filtersOpen.value || nearbyPromptOpen.value || huntSheetOpen.value) return
  if (!recommendedBadgeOpportunities.value.length || !auth.consumeBadgeWelcome?.()) return
  ensureRecommendedBadge()
  selectedHuntId.value = trackedBadgeId.value ?? recommendedBadgeOpportunities.value[0]?.id ?? null
  huntSheetOpen.value = Boolean(selectedHuntId.value)
}

function selectActivity(activity) {
  if (selectedActivity.value?.id !== activity.id) {
    clearSelectedTrail()
    setActivityMarkerSelected(activityMarkers.get(selectedActivity.value?.id), false)
  }
  selectedImageBroken.value = false
  selectedActivity.value = activity
  if (isNparksRoute(activity)) void loadSelectedTrail()
  setActivityMarkerSelected(activityMarkers.get(activity.id), true)
  focusMapOnActivity(map, activity, {
    isMobile: isMobileViewport(),
    reducedMotion: prefersReducedMotion(),
  })
}

function clearSelectedActivity() {
  clearSelectedTrail()
  setActivityMarkerSelected(activityMarkers.get(selectedActivity.value?.id), false)
  selectedActivity.value = null
}

function clearSelectedTrail() {
  trailLoadRequest += 1
  hideSelectedTrail()
  selectedRoute.value = null
  trailLoadState.value = 'idle'
  trailLoadError.value = ''
}

async function loadSelectedTrail({ retry = false } = {}) {
  const activity = selectedActivity.value
  if (!isNparksRoute(activity)) return
  const request = ++trailLoadRequest
  trailLoadState.value = 'loading'
  trailLoadError.value = ''
  selectedRoute.value = null
  try {
    const route = await getNparksRoute(activity, { retry })
    // A prior request may finish after the user has selected another activity.
    if (request !== trailLoadRequest || selectedActivity.value?.id !== activity.id) return
    selectedRoute.value = route
    trailLoadState.value = 'ready'
  } catch (error) {
    if (request !== trailLoadRequest || selectedActivity.value?.id !== activity.id) return
    trailLoadState.value = 'error'
    trailLoadError.value = error.message ?? 'Trail geometry could not be loaded.'
  }
}

function hideSelectedTrail() {
  if (trailLayer && map) map.removeLayer(trailLayer)
  trailLayer = null
  showingTrail.value = false
}

function toggleSelectedTrail() {
  if (showingTrail.value) { hideSelectedTrail(); return }
  if (!map || !canShowSelectedTrail.value) return
  trailLayer = L.geoJSON(selectedRoute.value, {
    style: { color: '#7541ec', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' },
  }).addTo(map)
  const bounds = trailLayer.getBounds()
  if (bounds.isValid()) map.fitBounds(bounds, {
    paddingTopLeft: isMobileViewport() ? [20, 110] : [390, 80],
    paddingBottomRight: isMobileViewport() ? [20, 290] : [50, 180],
    animate: !prefersReducedMotion(), maxZoom: 16,
  })
  showingTrail.value = true
}

function openSelectedActivity() {
  if (selectedActivity.value) router.push({ name: 'activity', params: { id: selectedActivity.value.id }, query: { from: 'map' } })
}

function selectCategory(categoryId) {
  if (categoryId === 'all') {
    filters.value.categories = []
    return
  }

  filters.value.categories = filters.value.categories.includes(categoryId)
    ? filters.value.categories.filter((id) => id !== categoryId)
    : [...filters.value.categories, categoryId]
}

function isCategorySelected(categoryId) {
  return categoryId === 'all'
    ? filters.value.categories.length === 0
    : filters.value.categories.includes(categoryId)
}

function toggleCategorySelector() {
  categorySelectorExpanded.value = !categorySelectorExpanded.value
}

function openCategorySelectorOnEntry(controlsVisible) {
  if (!controlsVisible || categorySelectorAutoOpened) return
  categorySelectorAutoOpened = true
  nextTick(() => {
    categorySelectorAnimationFrame = requestAnimationFrame(() => {
      categorySelectorExpanded.value = true
    })
  })
}

watch(onboardingStage, (stage) => {
  if (stage === 'locationPrompt') nextTick(() => introEnableButton.value?.focus())
  if (stage === 'completed') nextTick(() => {
    ensureRecommendedBadge()
    maybeOpenBadgeWelcome()
  })
})

watch(showDiscoveryControls, openCategorySelectorOnEntry, { immediate: true })

watch(nearbyPromptOpen, (open) => {
  if (open) nextTick(() => nearbyEnableButton.value?.focus())
})

watch([filtersOpen, nearbyPromptOpen], ([filtersAreOpen, nearbyPromptIsOpen]) => {
  if (!filtersAreOpen && !nearbyPromptIsOpen) nextTick(maybeOpenBadgeWelcome)
})

watch([nearMeEnabled, nearbyRadiusKm, locationCoords], () => {
  updateNearbyRadiusCircle()
})

watch(trackedBadgeId, () => nextTick(() => refreshHuntMarkers(true)))
watch(recommendedBadgeOpportunities, () => nextTick(ensureRecommendedBadge))
watch(() => trackedBadge.value?.earned, (earned) => {
  if (earned) nextTick(ensureRecommendedBadge)
})

onMounted(async () => {
  map = L.map(mapElement.value, { minZoom: MIN_MAP_ZOOM, maxZoom: MAX_MAP_ZOOM, zoomControl: false }).setView([1.3521, 103.8198], 12)
  map.attributionControl?.setPosition?.('topright')
  syncMapZoom()
  map.on('zoomend', syncMapZoom)

  tileLayer = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4uab_1_d012b4d2248d7dced0dc5dc2', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: MAX_MAP_ZOOM,
    minZoom: MIN_MAP_ZOOM,
    maxZoom: MAX_MAP_ZOOM,
  }).addTo(map)

  clusterLayer = createActivityClusterLayer(L, { isHuntEligible: (activity) => Boolean(trackedBadgeId.value && canActivityProgressBadge(trackedBadgeId.value, activity)) })
  clusterLayer.addTo(map)
  clusterLayer.on?.('spiderfied', syncHuntAfterClusterLifecycle)
  clusterLayer.on?.('unspiderfied', syncHuntAfterClusterLifecycle)
  clusterLayer.on?.('animationend', syncHuntAfterClusterLifecycle)
  updateResponsiveMapControls()
  window.addEventListener('resize', updateResponsiveMapControls)
  const loadPromise = loadActivities()
  if (onboardingEligible) {
    // Start after tiles arrive, but never hold the introduction hostage to a slow tile request.
    await new Promise((resolve) => {
      const fallback = window.setTimeout(resolve, 1200)
      tileReadyTimer = fallback
      tileLayer?.on?.('load', () => {
        window.clearTimeout(fallback)
        resolve()
      })
    })
    if (onboardingActive.value) startOnboarding()
  } else {
    onboardingStage.value = 'completed'
    setMapIntroActive(false)
    renderActivityMarkers(activities.value)
  }
  await loadPromise
  if (!onboardingActive.value) renderActivityMarkers(activities.value)
  ensureRecommendedBadge()
  maybeOpenBadgeWelcome()
})

watch(activities, (items) => {
  renderActivityMarkers(items)
  if (selectedActivity.value && !items.some((activity) => activity.id === selectedActivity.value.id)) {
    clearSelectedActivity()
  }
  nextTick(() => {
    ensureRecommendedBadge()
    maybeOpenBadgeWelcome()
  })
}, { deep: true })

watch(selectedActivity, (activity) => {
  if (!activity) nextTick(maybeOpenBadgeWelcome)
})

onBeforeUnmount(() => {
  onboardingRunId += 1
  locationRequestId += 1
  window.clearTimeout(tileReadyTimer)
  cancelAnimationFrame(categorySelectorAnimationFrame)
  removeTemporaryLocationMarker()
  clearSelectedTrail()
  removeNearbyRadiusCircle()
  setMapIntroActive(false)
  disableNearby()
  window.removeEventListener('resize', updateResponsiveMapControls)
  if (clusterLayer) clearActivityClusterLayer(clusterLayer)
  clusterLayer?.off?.('spiderfied', syncHuntAfterClusterLifecycle)
  clusterLayer?.off?.('unspiderfied', syncHuntAfterClusterLifecycle)
  clusterLayer?.off?.('animationend', syncHuntAfterClusterLifecycle)
  activityMarkers.clear()
  map?.off('zoomend', syncMapZoom)
  map?.remove()
  clusterLayer = null
  map = null
})
</script>

<template>
  <main class="gol-page map-page">
    <div ref="mapElement" class="leaflet-map" aria-label="Interactive map of Singapore" data-testid="leaflet-map"></div>

    <button v-if="onboardingActive" class="map-intro-skip" type="button" @click="skipOnboarding">Skip intro</button>

    <div
      v-if="showMapControls && showDesktopZoomControl"
      class="map-zoom-control"
      aria-label="Map zoom"
      @pointerdown.stop
      @mousedown.stop
      @dblclick.stop
      @wheel.stop
      @touchstart.stop
    >
      <span class="map-zoom-control__marker" aria-hidden="true">+</span>
      <label class="visually-hidden" for="map-zoom-range">Map zoom level</label>
      <input
        id="map-zoom-range"
        v-model.number="mapZoom"
        class="map-zoom-control__range"
        type="range"
        min="11"
        max="18"
        step="1"
        orient="vertical"
        :aria-valuetext="`Map zoom level ${mapZoom}`"
        data-testid="map-zoom-slider"
        @input="setMapZoom"
      />
      <span class="map-zoom-control__marker" aria-hidden="true">−</span>
    </div>

    <div v-if="showHeader || showDiscoveryControls" class="map-overlay">
      <div class="map-discovery-bar map-motion map-motion--header" @pointerdown.stop @mousedown.stop @dblclick.stop @touchstart.stop>
        <div class="map-mobile-header-surface">
          <header v-if="showHeader" class="map-header-card">
            <p class="gol-eyebrow">Explore Singapore</p>
            <h1 class="gol-title">Where we going?</h1>
          </header>

          <section v-if="showMapControls" class="map-next-badge" data-testid="next-badge-card">
            <button v-if="trackedBadge" class="map-next-badge__main" type="button" @click="openHuntSelector">
              <span class="map-hunt-entry__icon">{{ trackedBadge.emoji ?? '🏆' }}</span>
              <span><small>Next badge</small><strong>{{ trackedBadge.name }}</strong><em>{{ trackedBadge.progress }}/{{ trackedBadge.target }} activities completed</em><span class="map-next-badge__remaining">{{ trackedBadge.target - trackedBadge.progress }} more to go!</span><i><b :style="{ width: `${(trackedBadge.progress / trackedBadge.target) * 100}%` }"></b></i></span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
            <span v-else class="map-next-badge__complete"><span class="map-hunt-entry__icon">🎉</span><span><small>Badges</small><strong>All caught up!</strong></span></span>
          </section>
        </div>

        <div v-if="showDiscoveryControls" class="map-control-stack">
          <form class="map-search-toolbar" role="search" @submit.prevent>
            <SearchBar v-model="filters.query" placeholder="Search activities, places..." label="Search activities and places" />
            <FilterButton label="Open activity filters" icon="bi-sliders" @click="filtersOpen = true" />
          </form>

          <div class="map-category-anchor">
            <section class="map-category-selector" :class="{ 'map-category-selector--expanded': categorySelectorExpanded }" aria-label="Activity category filters">
              <button v-if="!categorySelectorExpanded" class="map-category-selector__summary" type="button" :aria-expanded="false" data-testid="map-category-toggle" @click="toggleCategorySelector">
                <span class="map-category-selector__sparkle" aria-hidden="true">✦</span>
                <span>{{ categoryMenuLabel }}</span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
              <template v-else>
                <div class="map-category-selector__rail" role="group" aria-label="Filter activities by category">
                  <button v-for="category in categories" :key="category.id" class="map-category" :class="{ 'map-category--selected': isCategorySelected(category.id), 'map-category--all': category.id === 'all' }" type="button" :aria-pressed="isCategorySelected(category.id)" :aria-label="category.id === 'all' ? 'Show all activity categories' : `Toggle ${category.label} activities`" :data-testid="`map-category-${category.id}`" @click="selectCategory(category.id)">
                    <span class="map-category__icon" :style="{ background: category.color }" aria-hidden="true">{{ category.emoji }}</span>
                    <span class="map-category__label">{{ category.id === 'all' ? 'All' : category.label }}</span>
                  </button>
                </div>
                <button class="map-category-selector__collapse" type="button" :aria-expanded="true" aria-label="Collapse activity categories" data-testid="map-category-collapse" @click="toggleCategorySelector"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
              </template>
            </section>
          </div>
        </div>
      </div>
    </div>

    <section v-if="showDiscoveryControls" class="map-nearby-row map-motion map-motion--nearby" aria-label="Nearby activity controls" @pointerdown.stop @mousedown.stop @dblclick.stop @touchstart.stop>
      <button class="map-nearby-switch" :class="{ 'map-nearby-switch--active': nearMeEnabled }" type="button" role="switch" :aria-checked="nearMeEnabled" :disabled="locationLoading" :aria-label="nearMeEnabled ? 'Turn off Near me' : 'Turn on Near me'" :aria-valuetext="nearMeEnabled ? `Near me on within ${nearbyRadiusKm} kilometres` : 'Near me off'" data-testid="map-nearby-toggle" @click="toggleNearby"><span class="map-nearby-switch__label"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> Near me</span><span class="map-nearby-switch__track" aria-hidden="true"><span></span></span></button>
      <label v-if="nearMeEnabled" class="map-radius-control" :style="{ '--radius-progress': `${((nearbyRadiusKm - 1) / 29) * 100}%` }"><span class="map-radius-control__heading"><span>Distance</span><strong>{{ nearbyRadiusKm }} km</strong></span><input :value="nearbyRadiusKm" class="map-radius-control__range" type="range" min="1" max="30" step="1" :aria-label="`Nearby distance: ${nearbyRadiusKm} kilometres`" :aria-valuetext="`${nearbyRadiusKm} kilometres`" data-testid="map-nearby-radius" @input="setNearbyRadius" @pointerdown.stop @mousedown.stop @touchstart.stop /></label>
    </section>

    <p v-if="showActivityMarkers && (!activities.length || (trackedBadge && !activeHuntOpportunity))" class="map-empty" role="status">
      {{ !activities.length ? (nearMeEnabled ? `No activities found within ${nearbyRadiusKm} km. Increase the distance, adjust filters, or turn off Near me.` : 'No activities match these filters. Try another category or filter.') : (nearMeEnabled ? `No nearby matches for this badge within ${nearbyRadiusKm} km. Increase radius or choose another badge.` : 'No qualifying activities match your current search. Try adjusting your filters or choosing another badge.') }}
    </p>
    <p v-if="onboardingMessage && onboardingStage === 'discoveryReveal'" class="map-intro-message" role="status">{{ onboardingMessage }}</p>
    <Transition name="map-selected-card">
      <section
        v-if="selectedActivity && showMapControls"
        class="map-activity-card"
        aria-label="Selected activity"
        data-testid="selected-map-activity"
        @pointerdown.stop
        @mousedown.stop
        @dblclick.stop
        @touchstart.stop
      >
        <button class="map-activity-card__close" type="button" aria-label="Close selected activity" @click="clearSelectedActivity">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <div class="map-activity-card__main">
          <div class="map-activity-card__image" :style="{ background: categoryColor(selectedActivity.category) }">
            <img v-if="selectedImage && !selectedImageBroken" :src="selectedImage" alt="" @error="selectedImageBroken = true" />
            <span v-else aria-hidden="true">{{ categoryEmoji(selectedActivity.category) }}</span>
          </div>
          <div class="map-activity-card__content">
            <p class="map-activity-card__area"><i class="bi bi-geo-alt" aria-hidden="true"></i> {{ selectedActivity.area || 'Singapore' }}</p>
            <h2>{{ selectedActivity.title }}</h2>
            <p class="map-activity-card__meta">{{ categoryLabel(selectedActivity.category) }} · {{ priceText(selectedActivity) }}</p>
            <p v-if="selectedWeather" class="map-activity-card__weather"><i class="bi bi-cloud-sun" aria-hidden="true"></i> {{ selectedWeather.forecast }}</p>
            <p v-if="selectedDescription" class="map-activity-card__description">{{ selectedDescription }}</p>
            <section v-if="selectedBadgeOpportunity" class="map-badge-opportunity" :aria-label="`${selectedBadgeOpportunity.name} badge opportunity`">
              <div class="map-badge-opportunity__heading">
                <span aria-hidden="true">{{ selectedBadgeOpportunity.emoji ?? '🏆' }}</span>
                <span><strong>{{ selectedBadgeOpportunity.name }}</strong><small>This activity counts towards this badge.</small></span>
              </div>
              <div class="map-badge-opportunity__progress-copy"><span>{{ selectedBadgeOpportunity.progress }}/{{ selectedBadgeOpportunity.target }} completed</span><span>{{ selectedBadgeOpportunity.target - selectedBadgeOpportunity.progress }} to go</span></div>
              <i class="map-badge-opportunity__progress" aria-hidden="true"><b :style="{ width: `${(selectedBadgeOpportunity.progress / selectedBadgeOpportunity.target) * 100}%` }"></b></i>
            </section>
          </div>
        </div>
        <div class="map-activity-card__actions" :class="{ 'map-activity-card__actions--route': selectedIsNparksRoute }">
          <button v-if="selectedIsNparksRoute" type="button" class="map-activity-card__trail" :disabled="trailLoadState === 'loading'" @click="trailLoadState === 'error' ? loadSelectedTrail({ retry: true }) : toggleSelectedTrail()">
            <i class="bi" :class="showingTrail ? 'bi-eye-slash' : 'bi-signpost-2'" aria-hidden="true"></i> {{ trailLoadState === 'loading' ? 'Loading Trail…' : trailLoadState === 'error' ? 'Retry Trail' : showingTrail ? 'Hide Trail' : 'View Trail' }}
          </button>
          <a v-if="selectedDirections" :href="selectedDirections" target="_blank" rel="noopener" class="map-activity-card__directions">
            <i class="bi bi-signpost-split" aria-hidden="true"></i> Directions
          </a>
          <button type="button" class="map-activity-card__view" @click="openSelectedActivity"><i class="bi bi-arrow-up-right" aria-hidden="true"></i> View Activity</button>
        </div>
        <p v-if="selectedIsNparksRoute && trailLoadState === 'error'" class="map-activity-card__trail-error" role="status">{{ trailLoadError }}</p>
      </section>
    </Transition>
    <FilterSheet
      v-if="showMapControls"
      :open="filtersOpen"
      :show-categories="false"
      :show-regions="true"
      :result-count="activities.length"
      @close="filtersOpen = false"
    />
    <BadgeHuntSheet :open="huntSheetOpen" :opportunities="recommendedBadgeOpportunities" :selected-id="selectedHuntId" @select="selectRecommendedBadge" @view-all="huntSheetOpen = false; router.push({ name: 'badges' })" @close="huntSheetOpen = false" />

    <div v-if="nearbyPromptOpen" class="map-intro-backdrop">
      <section class="map-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="nearby-location-title">
        <div class="map-intro-dialog__icon" aria-hidden="true"><i class="bi bi-geo-alt-fill"></i></div>
        <h2 id="nearby-location-title">Find activities near you? 📍</h2>
        <p>Enable your location to discover activities and experiences near you. You can still explore Singapore without sharing your location.</p>
        <p class="map-intro-dialog__hint">Your browser will ask for permission before sharing your location.</p>
        <p v-if="nearbyPromptMessage" class="map-intro-dialog__error" role="status">{{ nearbyPromptMessage }}</p>
        <div class="map-intro-dialog__actions">
          <button ref="nearbyEnableButton" class="map-intro-dialog__enable" type="button" :disabled="locationLoading" @click="confirmNearbyLocation">
            {{ locationLoading ? 'Finding your location…' : 'Enable Location' }}
          </button>
          <button class="map-intro-dialog__not-now" type="button" :disabled="locationLoading" @click="declineNearbyLocation">Not Now</button>
        </div>
      </section>
    </div>

    <div v-if="onboardingStage === 'locationPrompt' || onboardingStage === 'locatingUser'" class="map-intro-backdrop">
      <section class="map-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="map-intro-title">
        <div class="map-intro-dialog__icon" aria-hidden="true"><i class="bi bi-geo-alt-fill"></i></div>
        <h2 id="map-intro-title">Find activities near you? 📍</h2>
        <p>Enable your location to discover activities and experiences near you. You can still explore Singapore without sharing your location.</p>
        <p class="map-intro-dialog__hint">Your browser will ask for permission before sharing your location.</p>
        <p v-if="onboardingMessage" class="map-intro-dialog__error" role="status">{{ onboardingMessage }}</p>
        <div class="map-intro-dialog__actions">
          <button ref="introEnableButton" class="map-intro-dialog__enable" type="button" :disabled="onboardingStage === 'locatingUser'" @click="enableOnboardingLocation">
            {{ onboardingStage === 'locatingUser' ? 'Finding your location…' : 'Enable Location' }}
          </button>
          <button class="map-intro-dialog__not-now" type="button" :disabled="onboardingStage === 'locatingUser'" @click="declineOnboardingLocation">Not Now</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.map-page {
  position: relative;
  height: 100dvh;
  min-height: 32rem;
  overflow: hidden;
}
.map-hunt-active { position:absolute; z-index:1002; right:1rem; bottom:calc(2.25rem + env(safe-area-inset-bottom)); display:flex; align-items:center; width:min(23rem,calc(100% - 2rem)); padding:.7rem; border:1px solid rgba(35,25,65,.16); border-radius:22px; background:#fffaf0; box-shadow:0 5px 16px rgba(35,25,65,.18); color:var(--gol-ink); font-family:var(--gol-font); }.map-hunt-active__main { display:flex; flex:1; min-width:0; align-items:center; gap:.65rem; padding:0; border:0; background:transparent; color:inherit; text-align:left; }.map-hunt-active__main > span:last-child,.map-hunt-active--complete > span:last-child { display:grid; gap:.15rem; min-width:0; }.map-hunt-entry__icon { display:grid; width:2.15rem; height:2.15rem; place-items:center; flex:0 0 auto; border-radius:11px; background:#ffe58c; font-size:1.2rem; }.map-hunt-active strong { overflow:hidden; color:var(--gol-ink); font-size:.9rem; text-overflow:ellipsis; white-space:nowrap; }.map-hunt-active small { color:var(--gol-muted); font-size:.7rem; font-weight:800; }.map-hunt-active__eyebrow { color:var(--gol-purple) !important; font-size:.62rem !important; letter-spacing:.08em; text-transform:uppercase; }.map-hunt-active__location { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.map-hunt-active__progress { display:block; height:7px; overflow:hidden; margin-top:.15rem; border-radius:99px; background:#e5dcef; }.map-hunt-active__progress b { display:block; height:100%; border-radius:inherit; background:var(--gol-purple); }.map-hunt-active--complete { gap:.65rem; }
.map-badge-opportunity { display:grid; gap:.4rem; margin:.55rem 0 0; padding:.6rem; border-radius:12px; background:#fff5c8; color:#725400; font-size:.74rem; font-weight:800; line-height:1.35; }
.map-badge-opportunity__heading { display:flex; align-items:center; gap:.45rem; }.map-badge-opportunity__heading > span:first-child { display:grid; width:1.8rem; height:1.8rem; flex:0 0 auto; place-items:center; border-radius:9px; background:#ffe58c; font-size:1rem; }.map-badge-opportunity__heading > span:last-child { display:grid; gap:.02rem; }.map-badge-opportunity__heading strong { color:var(--gol-ink); }.map-badge-opportunity__heading small { color:#80621d; font-size:.68rem; }.map-badge-opportunity__progress-copy { display:flex; justify-content:space-between; gap:.5rem; color:#725400; font-size:.68rem; }.map-badge-opportunity__progress { display:block; height:6px; overflow:hidden; border-radius:99px; background:rgba(107,66,227,.18); }.map-badge-opportunity__progress b { display:block; height:100%; border-radius:inherit; background:var(--gol-purple); }

.map-intro-skip {
  position: absolute;
  z-index: 1102;
  top: calc(1rem + env(safe-area-inset-top));
  right: 1rem;
  padding: .48rem .8rem;
  border: 1px solid rgba(35, 25, 65, .18);
  border-radius: 999px;
  background: rgba(255, 253, 248, .94);
  box-shadow: 0 3px 10px rgba(35, 25, 65, .12);
  color: var(--gol-ink);
  font: 800 .78rem var(--gol-font);
}
.map-intro-skip:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }

.map-intro-backdrop {
  position: absolute;
  z-index: 1101;
  inset: 0;
  display: grid;
  padding: 1.25rem;
  place-items: center;
  background: rgba(34, 26, 59, .12);
  pointer-events: none;
}
.map-intro-dialog {
  width: min(26rem, 100%);
  padding: 1.35rem;
  border: 2px solid var(--gol-card-edge);
  border-radius: 24px;
  background: #fffdf8;
  box-shadow: 0 16px 38px rgba(35, 25, 65, .25);
  color: var(--gol-ink);
  font-family: var(--gol-font);
  pointer-events: auto;
  animation: map-intro-dialog-in .28s cubic-bezier(.34, 1.4, .64, 1) both;
}
.map-intro-dialog__icon { display: grid; width: 2.7rem; height: 2.7rem; place-items: center; border-radius: 50%; background: var(--gol-purple); color: #fff; font-size: 1.25rem; }
.map-intro-dialog h2 { margin: .8rem 0 .45rem; font-size: 1.35rem; font-weight: 900; }
.map-intro-dialog p { margin: 0; color: var(--gol-muted); font-size: .91rem; font-weight: 700; line-height: 1.45; }
.map-intro-dialog__hint { margin-top: .7rem !important; font-size: .76rem !important; }
.map-intro-dialog__error { margin-top: .7rem !important; color: #a74343 !important; }
.map-intro-dialog__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; margin-top: 1rem; }
.map-intro-dialog__enable,.map-intro-dialog__not-now { min-height: 3rem; border-radius: 16px; font: 800 .88rem var(--gol-font); }
.map-intro-dialog__enable { border: 0; background: var(--gol-purple); box-shadow: inset 0 -3px 0 var(--gol-purple-dark); color: #fff; }
.map-intro-dialog__not-now { border: 1px solid var(--gol-card-edge); background: #fff; color: var(--gol-ink); }
.map-intro-dialog__enable:disabled,.map-intro-dialog__not-now:disabled { opacity: .62; cursor: wait; }

.map-intro-message {
  position: absolute;
  z-index: 1100;
  top: 1rem;
  left: 50%;
  width: min(27rem, calc(100% - 2rem));
  margin: 0;
  padding: .7rem .9rem;
  transform: translateX(-50%);
  border-radius: 14px;
  background: rgba(255, 253, 248, .96);
  box-shadow: 0 4px 14px rgba(35, 25, 65, .16);
  color: var(--gol-muted);
  font: 800 .78rem/1.35 var(--gol-font);
  text-align: center;
}

.map-overlay {
  position: absolute;
  z-index: 1001;
  top: 1.5rem;
  left: 1.5rem;
  width: min(42.5rem, calc(100% - 3rem));
  display: grid;
  justify-items: start;
  gap: .75rem;
  pointer-events: none;
}

.map-overlay__card { pointer-events: auto; }
.map-motion { animation: map-overlay-in .46s cubic-bezier(.34, 1.56, .64, 1) both; }
.map-motion--header { animation-delay: .04s; }
.map-motion--search { animation-delay: .12s; }
.map-motion--nearby { animation-delay: .18s; }
.map-motion--categories { animation-delay: .24s; }

.map-header-card,
.map-category-card {
  background: #fff8ef;
  box-shadow: 0 4px 16px rgba(35, 25, 65, .08);
}

.map-header-card {
  width: fit-content;
  max-width: 100%;
  padding: .875rem 1rem;
  border-radius: 20px;
  transition: transform .16s ease, box-shadow .16s ease;
}

.map-header-card .gol-eyebrow { margin: 0 0 .2rem; font-size: .75rem; font-weight: 800; letter-spacing: .08em; }
.map-header-card .gol-title { color: var(--gol-ink); font-size: 2rem; font-weight: 800; line-height: 1.15; }

.map-search-toolbar {
  display: flex;
  align-items: center;
  gap: .625rem;
  width: 100%;
}

.map-search-toolbar :deep(.gol-search-bar) { min-height: 3.375rem; border-width: 1px; box-shadow: 0 4px 14px rgba(35, 25, 65, .10); transition: transform .16s ease, box-shadow .16s ease; }
.map-search-toolbar :deep(.gol-filter-button) { width: 3.375rem; height: 3.375rem; box-shadow: 0 4px 14px rgba(35, 25, 65, .18); transition: transform .14s ease, box-shadow .14s ease; }
.map-nearby-row {
  display: flex;
  align-items: stretch;
  gap: .75rem;
  width: 100%;
  pointer-events: auto;
}
.map-nearby-switch {
  display: inline-flex;
  min-width: max-content;
  min-height: 4rem;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  padding: 0 .75rem;
  border: 2px solid var(--gol-card-edge);
  border-radius: 16px;
  background: #fff8ef;
  box-shadow: 0 4px 14px rgba(35, 25, 65, .12);
  color: var(--gol-ink);
  font: 800 .76rem var(--gol-font);
  cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease, background .14s ease, color .14s ease, border-color .14s ease;
}
.map-nearby-switch--active { border-color: var(--gol-purple); background: #f0ebff; color: var(--gol-purple); }
.map-nearby-switch__label { white-space: nowrap; }
.map-nearby-switch__track { display: flex; width: 2.25rem; height: 1.32rem; align-items: center; padding: .12rem; border-radius: 999px; background: #bdb2c8; transition: background .16s ease; }
.map-nearby-switch__track span { width: 1.08rem; height: 1.08rem; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(35, 25, 65, .24); transition: transform .16s ease; }
.map-nearby-switch--active .map-nearby-switch__track { background: var(--gol-purple); }
.map-nearby-switch--active .map-nearby-switch__track span { transform: translateX(.93rem); }
.map-nearby-switch:disabled { cursor: wait; opacity: .7; }
.map-nearby-switch:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-radius-control {
  display: grid;
  flex: 1 1 15rem;
  min-width: 12rem;
  min-height: 4rem;
  align-content: center;
  gap: .38rem;
  padding: .55rem .8rem;
  border: 2px solid var(--gol-card-edge);
  border-radius: 16px;
  background: #fff8ef;
  box-shadow: 0 4px 14px rgba(35, 25, 65, .12);
  color: var(--gol-ink);
  font: 800 .75rem var(--gol-font);
}
.map-radius-control__heading { display: flex; justify-content: space-between; gap: 1rem; }
.map-radius-control__heading strong { color: var(--gol-purple); }
.map-radius-control__range {
  width: 100%;
  height: .6rem;
  margin: 0;
  accent-color: var(--gol-purple);
  appearance: none;
  border-radius: 999px;
  background: linear-gradient(to right, var(--gol-purple) 0 var(--radius-progress), #d8d0df var(--radius-progress) 100%);
  cursor: pointer;
}
.map-radius-control__range::-webkit-slider-thumb { width: 1rem; height: 1rem; appearance: none; border: 2px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 1px 4px rgba(35, 25, 65, .3); }
.map-radius-control__range::-moz-range-thumb { width: .82rem; height: .82rem; border: 2px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 1px 4px rgba(35, 25, 65, .3); }
.map-radius-control__range:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-radius-control--disabled { color: var(--gol-muted); opacity: .72; }
.map-radius-control--disabled .map-radius-control__heading strong { color: var(--gol-muted); }
.map-radius-control__range:disabled { cursor: not-allowed; background: #d8d0df; }

.map-category-card {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-height: 5.85rem;
  padding: .75rem 3.35rem .75rem .75rem;
  border-radius: 20px;
  overflow: hidden;
  transition: width 200ms ease-in-out, border-radius 200ms ease-in-out, min-height 200ms ease-in-out, transform .16s ease, box-shadow .16s ease;
}

.map-category-card--collapsed {
  min-height: 3.15rem;
  padding: .45rem 3rem .45rem .75rem;
  border-radius: 999px;
}

.map-category-rail {
  display: flex;
  gap: .875rem;
  max-width: 100%;
  padding: .15rem .1rem .2rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  touch-action: pan-x;
}
.map-category-rail::-webkit-scrollbar { display: none; }

.map-category {
  display: grid;
  flex: 0 0 4.55rem;
  justify-items: center;
  gap: .3rem;
  padding: .15rem .1rem;
  border: 0;
  border-radius: 16px;
  color: var(--gol-ink);
  background: transparent;
  font: 600 .69rem/1.1 var(--gol-font);
  text-align: center;
}

.map-category__icon {
  display: grid;
  width: 2.875rem;
  height: 2.875rem;
  place-items: center;
  border: 2px solid var(--gol-ink);
  border-radius: 50%;
  box-shadow: 2px 3px 0 var(--gol-ink);
  color: var(--gol-ink);
  font-size: 1.2rem;
  transition: transform .14s ease;
}

.map-category__label { min-height: 1.5rem; display: grid; align-items: start; }
.map-category--all .map-category__icon { color: #fff; }
.map-category--selected { background: var(--gol-purple); color: #fff; }
.map-category--selected .map-category__icon { animation: map-category-pop .42s cubic-bezier(.34, 1.56, .64, 1); }
.map-category:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-category:active .map-category__icon { transform: translateY(2px) scale(.94); }

.map-category-summary {
  display: inline-flex;
  align-items: center;
  gap: .55rem;
  max-width: 100%;
  min-height: 2.25rem;
  overflow: hidden;
  color: var(--gol-ink);
  font: 800 .83rem/1.1 var(--gol-font);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-category-summary__icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  border: 2px solid var(--gol-ink);
  border-radius: 50%;
  color: var(--gol-ink);
}

.map-category-toggle {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: .65rem;
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  place-items: center;
  transform: translateY(-50%);
  border: 1px solid var(--gol-card-edge);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(35, 25, 65, .12);
  color: var(--gol-purple);
}
.map-category-toggle:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-category-toggle,.map-activity-card__close,.map-activity-card__directions,.map-activity-card__view { transition: transform .14s ease, box-shadow .14s ease, filter .14s ease; }

.map-empty {
  position: absolute;
  z-index: 1000;
  top: min(21rem, 46dvh);
  left: 50%;
  width: min(23rem, calc(100% - 2rem));
  margin: 0;
  padding: .85rem 1rem;
  transform: translateX(-50%);
  border: 2px solid var(--gol-card-edge);
  border-radius: 18px;
  background: rgba(255, 255, 255, .95);
  box-shadow: 0 4px 12px rgba(34, 26, 59, .15);
  color: var(--gol-muted);
  font: 800 .85rem/1.4 var(--gol-font);
  text-align: center;
  pointer-events: none;
}

:deep(.gol-activity-marker-wrapper),
:deep(.gol-cluster-marker-wrapper) {
  border: 0;
  background: transparent;
}

:deep(.map-user-location-marker-wrapper) { border: 0; background: transparent; }
:deep(.map-user-location-marker) { display: grid; justify-items: center; width: 116px; filter: drop-shadow(0 3px 5px rgba(80, 24, 34, .26)); }
:deep(.map-user-location-marker__label) { padding: .28rem .52rem; border: 2px solid #fff; border-radius: 999px; background: #e84b4b; box-shadow: 0 2px 0 rgba(96, 30, 40, .25); color: #fff; font: 900 .62rem/1 var(--gol-font); letter-spacing: .04em; white-space: nowrap; }
:deep(.map-user-location-marker__pin) { display: grid; width: 2.25rem; height: 2.25rem; margin-top: .18rem; place-items: center; border: 3px solid #fff; border-radius: 50% 50% 50% 0; background: #e84b4b; box-shadow: 0 2px 0 rgba(96, 30, 40, .3); color: #fff; font-size: 1.16rem; transform: rotate(-45deg); }
:deep(.map-user-location-marker__pin i) { transform: rotate(45deg); }
:deep(.map-user-location-marker--intro) { animation: map-user-location-pop .48s cubic-bezier(.34, 1.5, .64, 1) both; }
:deep(.map-intro-marker-wrapper) { border: 0; background: transparent; }
:deep(.map-intro-marker) { display: grid; width: 48px; height: 48px; place-items: center; border: 3px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 5px 14px rgba(35, 25, 65, .34); color: #fff; font-size: 1.45rem; animation: map-intro-marker-pop .5s cubic-bezier(.34, 1.5, .64, 1) both; }

:deep(.gol-cluster-marker) {
  position: relative;
  width: 62px;
  height: 62px;
}

:deep(.gol-cluster-marker__layer),
:deep(.gol-cluster-marker__front) {
  position: absolute;
  inset: 6px;
  border: 4px solid #fff;
  border-radius: 18px;
}

:deep(.gol-cluster-marker__layer--back) {
  background: var(--gol-cyan);
  transform: translate(-5px, 6px) rotate(-11deg);
}

:deep(.gol-cluster-marker__layer--middle) {
  background: var(--gol-yellow);
  transform: translate(5px, 3px) rotate(8deg);
}

:deep(.gol-cluster-marker__front) {
  display: grid;
  place-items: center;
  background: var(--gol-purple);
  box-shadow: 5px 7px 0 rgba(34, 26, 59, 0.25);
  color: #fff;
  font-size: 1.45rem;
}

:deep(.gol-cluster-marker__count) {
  position: absolute;
  top: -3px;
  right: -4px;
  z-index: 2;
  display: grid;
  min-width: 1.45rem;
  height: 1.45rem;
  padding: 0 0.25rem;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--gol-coral);
  box-shadow: 0 2px 0 rgba(34, 26, 59, 0.2);
  color: #fff;
  font-family: var(--gol-font);
  font-size: 0.68rem;
  font-weight: 900;
}

.map-activity-card {
  position: absolute;
  z-index: 1003;
  bottom: 7.25rem;
  left: 1.5rem;
  width: min(46rem, calc(100% - 3rem));
  padding: 1.1rem;
  border-radius: 28px;
  background: rgba(255, 248, 239, .97);
  box-shadow: 0 10px 28px rgba(35, 25, 65, .18);
  color: var(--gol-ink);
  font-family: var(--gol-font);
}

.map-activity-card__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: grid;
  width: 2rem;
  height: 2rem;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--gol-muted);
  font-size: 1.2rem;
}
.map-activity-card__close:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 2px; }
.map-activity-card__main { display: flex; gap: .8rem; padding-right: 1.5rem; }
.map-activity-card__image { display: grid; width: 7rem; height: 7rem; flex: 0 0 auto; place-items: center; overflow: hidden; border-radius: 18px; color: var(--gol-ink); font-size: 2.8rem; }
.map-activity-card__image img { width: 100%; height: 100%; object-fit: cover; }
.map-activity-card__content { min-width: 0; }
.map-activity-card__area { margin: 0 0 .25rem; color: var(--gol-muted); font-size: .84rem; font-weight: 700; }
.map-activity-card__content h2 { margin: 0; padding-right: 1.2rem; font-size: clamp(1.15rem, 3vw, 1.7rem); font-weight: 900; line-height: 1.15; }
.map-activity-card__meta,.map-activity-card__weather,.map-activity-card__description { margin: .42rem 0 0; color: var(--gol-muted); font-weight: 700; line-height: 1.35; }
.map-activity-card__weather { color: var(--gol-ink); }
.map-activity-card__description { font-size: .88rem; }
.map-activity-card__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: .8rem; }
.map-activity-card__actions--route { grid-template-columns: repeat(3, 1fr); }
.map-activity-card__trail,.map-activity-card__directions,.map-activity-card__view { display: inline-flex; min-height: 3rem; align-items: center; justify-content: center; gap: .45rem; border-radius: 16px; font: 800 .9rem var(--gol-font); text-decoration: none; }
.map-activity-card__trail { border: 0; background: #e9defe; color: var(--gol-purple-dark); }
.map-activity-card__trail:disabled { cursor: wait; opacity: .65; }
.map-activity-card__trail-error { margin: .55rem 0 0; color: var(--gol-coral-text); font-size: .8rem; font-weight: 700; }
.map-activity-card__directions { border: 0; background: #fff; color: var(--gol-ink); }
.map-activity-card__view { border: 0; background: var(--gol-purple); box-shadow: inset 0 -4px 0 var(--gol-purple-dark); color: #fff; }
.map-activity-card__view:focus-visible,.map-activity-card__directions:focus-visible,.map-activity-card__trail:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-selected-card-enter-active,.map-selected-card-leave-active { transition: opacity .24s ease, transform .28s cubic-bezier(.34, 1.56, .64, 1); }
.map-selected-card-enter-from,.map-selected-card-leave-to { opacity: 0; transform: translateY(28px) scale(.96); }

@media (hover: hover) and (pointer: fine) {
  .map-header-card:hover,.map-category-card:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(35, 25, 65, .13); }
  .map-search-toolbar :deep(.gol-search-bar):hover { transform: translateY(-1px); }
  .map-nearby-switch:hover,.map-radius-control:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(35, 25, 65, .18); }
  .map-category:hover .map-category__icon { transform: translateY(-3px) rotate(4deg); }
  .map-category-toggle:hover { transform: translateY(calc(-50% - 3px)); }
  .map-activity-card__close:hover { transform: translateY(-2px); }
  .map-activity-card__directions:hover,.map-activity-card__view:hover,.map-activity-card__trail:hover { transform: translateY(-2px); filter: brightness(1.03); }
}

@keyframes map-overlay-in {
  from { opacity: 0; transform: translateY(-14px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes map-category-pop {
  0% { transform: scale(.82) rotate(-7deg); }
  65% { transform: scale(1.12) rotate(4deg); }
  100% { transform: scale(1) rotate(0); }
}

@keyframes map-intro-marker-pop {
  from { opacity: 0; transform: translateY(12px) scale(.4); }
  70% { opacity: 1; transform: translateY(-2px) scale(1.08); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes map-user-location-pop { from { transform: translateY(8px) scale(.5); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes map-intro-dialog-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

.leaflet-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Keep Leaflet's real, linked attribution visible above the custom controls. */
:deep(.leaflet-top.leaflet-right) { top: calc(.5rem + env(safe-area-inset-top)); right: .5rem; }
:deep(.leaflet-top.leaflet-right .leaflet-control-attribution) { margin: 0; padding: .22rem .38rem; border-radius: 9px; background: rgba(255,253,248,.94); box-shadow: 0 2px 8px rgba(35,25,65,.14); font: 600 .62rem/1.25 var(--gol-font); }
:deep(.leaflet-top.leaflet-right .leaflet-control-attribution a) { color: var(--gol-purple); }

.map-zoom-control {
  position: absolute;
  z-index: 1001;
  top: 3.25rem;
  right: .75rem;
  display: grid;
  width: 3.1rem;
  justify-items: center;
  gap: .3rem;
  padding: .45rem .35rem;
  border: 1px solid var(--gol-card-edge);
  border-radius: 999px;
  background: rgba(255, 253, 248, .97);
  box-shadow: 0 4px 14px rgba(35, 25, 65, .16);
  touch-action: none;
}
.map-zoom-control__marker {
  display: grid;
  width: 1.4rem;
  height: 1.25rem;
  place-items: center;
  color: var(--gol-purple);
  font: 900 1.1rem/1 var(--gol-font);
}
.map-zoom-control__range {
  --zoom-track-width: .35rem;
  --zoom-thumb-size: 1.2rem;
  display: block;
  width: var(--zoom-thumb-size);
  height: 10.25rem;
  margin: 0 auto;
  padding: 0;
  appearance: slider-vertical;
  accent-color: var(--gol-purple);
  cursor: ns-resize;
  direction: rtl;
  writing-mode: vertical-lr;
}
.map-zoom-control__range:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; border-radius: 999px; }
.map-zoom-control__range::-webkit-slider-runnable-track { width: var(--zoom-track-width); border-radius: 999px; background: #e6ddf9; }
.map-zoom-control__range::-webkit-slider-thumb { width: var(--zoom-thumb-size); height: var(--zoom-thumb-size); margin-left: calc((var(--zoom-track-width) - var(--zoom-thumb-size)) / 2 + .1rem); appearance: none; border: 3px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 2px 5px rgba(35, 25, 65, .25); }
.map-zoom-control__range::-moz-range-track { width: var(--zoom-track-width); border-radius: 999px; background: #e6ddf9; }
.map-zoom-control__range::-moz-range-thumb { width: 1.05rem; height: 1.05rem; border: 3px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 2px 5px rgba(35, 25, 65, .25); }

@media (max-width: 767.98px) {
  .map-overlay { top: calc(.75rem + env(safe-area-inset-top)); left: .75rem; width: calc(100% - 1.5rem); gap: .5rem; }
  .map-header-card { padding: .65rem .75rem; border-radius: 16px; }
  .map-header-card .gol-eyebrow { font-size: .63rem; }
  .map-header-card .gol-title { font-size: 1.5rem; }
  .map-search-toolbar { gap: .5rem; }
  .map-search-toolbar :deep(.gol-search-bar) { min-height: 3rem; }
  .map-search-toolbar :deep(.gol-filter-button) { width: 3rem; height: 3rem; }
  .map-nearby-row { gap: .5rem; }
  .map-nearby-switch { min-height: 3.75rem; padding: 0 .55rem; border-radius: 16px; font-size: .7rem; }
  .map-radius-control { min-height: 3.75rem; min-width: 0; padding: .45rem .65rem; }
  .map-category-card { min-height: 5.1rem; padding: .625rem 3rem .625rem .625rem; border-radius: 16px; }
  .map-category-card--collapsed { min-height: 3rem; padding: .4rem 2.8rem .4rem .625rem; }
  .map-category { flex-basis: 4.2rem; font-size: .64rem; }
  .map-category__icon { width: 2.5rem; height: 2.5rem; font-size: 1.05rem; }
  .map-category-toggle { right: .45rem; width: 2.1rem; height: 2.1rem; }
  .map-hunt-active { right:.75rem; bottom:calc(5.75rem + env(safe-area-inset-bottom)); }
  .map-hunt-entry__icon { width:1.85rem; height:1.85rem; font-size:1rem; }
  .map-hunt-active { width:min(16.5rem,calc(100% - 1.5rem)); padding:.55rem; }
  .map-activity-card { bottom: calc(5.75rem + env(safe-area-inset-bottom)); left: .75rem; width: calc(100% - 1.5rem); max-height:calc(100dvh - 7.25rem - env(safe-area-inset-bottom)); padding: 1rem; overflow-y:auto; overscroll-behavior:contain; border-radius: 24px; }
  .map-activity-card__main { gap: .75rem; padding-right: 1rem; }
  .map-activity-card__image { width: 5.75rem; height: 5.75rem; border-radius: 18px; font-size: 2.4rem; }
  .map-activity-card__content h2 { font-size: 1.1rem; }
  .map-activity-card__description { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .map-activity-card__actions--route { grid-template-columns: 1fr 1fr; }
  .map-activity-card__actions--route .map-activity-card__trail { grid-column: 1 / -1; }
  .map-activity-card__directions,.map-activity-card__view { min-height: 3rem; font-size: .88rem; }
  .map-intro-backdrop { align-items: end; padding: 1rem 1rem calc(6.75rem + env(safe-area-inset-bottom)); }
  .map-intro-dialog { border-radius: 22px; }

  :deep(.leaflet-bottom.leaflet-right) {
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
  }
}

/* Discovery controls: separate desktop surfaces, one compact mobile card. */
.map-overlay { width:min(92rem, calc(100% - 3rem)); }
.map-discovery-bar { display:flex; align-items:center; gap:.75rem; width:100%; padding:.75rem; border-radius:24px; background:#fff8ef; box-shadow:0 4px 16px rgba(35,25,65,.12); pointer-events:auto; }
.map-header-card { flex:0 0 auto; padding:0; background:transparent; box-shadow:none; }
.map-control-stack { flex:1 1 17rem; min-width:0; }
.map-search-toolbar { width:auto; }
.map-category-selector { position:relative; display:flex; grid-column:1; width:clamp(10.5rem, 25%, 13rem); min-width:0; min-height:3.375rem; overflow:hidden; align-items:center; border:1px solid rgba(35,25,65,.14); border-radius:999px; background:#fff8ef; box-shadow:0 4px 14px rgba(35,25,65,.12); transition:width .32s cubic-bezier(.22, 1, .36, 1), min-height .28s ease-out, border-radius .28s ease-out, box-shadow .28s ease; }
.map-category-selector--expanded { width:100%; min-height:5.85rem; border-radius:20px; }
.map-category-selector__summary { display:flex; width:100%; min-width:0; align-items:center; gap:.5rem; padding:.42rem .5rem .42rem .62rem; border:0; background:transparent; color:var(--gol-ink); font:800 .76rem var(--gol-font); text-align:left; }
.map-category-selector__summary > span:nth-child(2) { overflow:hidden; flex:1; text-overflow:ellipsis; white-space:nowrap; }
.map-category-selector__sparkle { display:grid; width:2.1rem; height:2.1rem; flex:0 0 auto; place-items:center; border-radius:50%; background:var(--gol-purple); color:#fff; font-size:1.05rem; }
.map-category-selector__summary > .bi,.map-category-selector__collapse { display:grid; width:2.1rem; height:2.1rem; flex:0 0 auto; padding:0; place-items:center; border:1px solid rgba(35,25,65,.12); border-radius:50%; background:#fff; color:var(--gol-purple); box-shadow:0 2px 7px rgba(35,25,65,.12); }
.map-category-selector__rail { display:flex; min-width:0; flex:1; gap:.7rem; padding:.45rem .2rem .35rem .65rem; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none; touch-action:pan-x; }
.map-category-selector__rail::-webkit-scrollbar { display:none; }
.map-category-selector .map-category { flex:0 0 4.25rem; }
.map-category-selector .map-category--selected { background:transparent; color:var(--gol-ink); font-weight:800; }
.map-category-selector .map-category__icon { position:relative; overflow:visible; }
.map-category-selector .map-category--selected .map-category__icon { box-shadow:2px 3px 0 var(--gol-ink), 0 0 0 2px var(--gol-purple); }
.map-category-selector .map-category--selected .map-category__icon::after { content:'✓'; position:absolute; z-index:1; top:-.4rem; right:-.4rem; display:grid; width:1.25rem; height:1.25rem; place-items:center; border:2px solid #fff8ef; border-radius:50%; background:var(--gol-purple); box-shadow:0 1px 4px rgba(35,25,65,.24); color:#fff; font:900 .72rem/1 var(--gol-font); }
.map-category-selector .map-category--selected .map-category__label { color:var(--gol-ink); font-weight:800; }
.map-category-selector__collapse { margin-right:.55rem; }
.map-next-badge { display:flex; min-width:11.5rem; padding-left:.75rem; border-left:1px solid rgba(35,25,65,.14); }.map-next-badge__main,.map-next-badge__complete { display:flex; width:100%; min-width:0; align-items:center; gap:.5rem; padding:0; border:0; background:transparent; color:var(--gol-ink); text-align:left; }.map-next-badge__main > span:nth-child(2),.map-next-badge__complete > span:last-child { display:grid; min-width:0; gap:.08rem; }.map-next-badge small { color:var(--gol-purple); font:900 .58rem var(--gol-font); letter-spacing:.08em; text-transform:uppercase; }.map-next-badge strong { overflow:hidden; font:900 .78rem var(--gol-font); text-overflow:ellipsis; white-space:nowrap; }.map-next-badge em { color:var(--gol-muted); font:800 .65rem var(--gol-font); font-style:normal; }.map-next-badge__remaining { color:var(--gol-purple); font:800 .68rem var(--gol-font); }.map-next-badge i:not(.bi) { display:block; height:5px; overflow:hidden; border-radius:99px; background:#e5dcef; }.map-next-badge i:not(.bi) b { display:block; height:100%; border-radius:inherit; background:var(--gol-purple); }.map-next-badge > .bi { color:var(--gol-purple); }
.map-nearby-row { position:absolute; z-index:1002; bottom:calc(1.5rem + 5.1rem + .75rem); left:max(1rem, calc(50vw - 310px)); width:auto; max-width:calc(100% - 2rem); gap:.45rem; pointer-events:auto; }.map-nearby-switch { min-height:3rem; border:1px solid rgba(35,25,65,.14); border-radius:16px; box-shadow:0 5px 16px rgba(35,25,65,.18); }.map-radius-control { min-width:13rem; min-height:3rem; padding:.35rem .65rem; border:1px solid rgba(35,25,65,.14); border-radius:16px; box-shadow:0 5px 16px rgba(35,25,65,.18); }
.map-zoom-control { top:auto; right:1rem; bottom:6.75rem; }

@media (min-width: 768px) {
  .map-mobile-header-surface { display:contents; }
  .map-overlay { width:auto; max-width:calc(100% - 3rem); }
  .map-discovery-bar { display:grid; grid-template-columns:max-content clamp(17rem, 35vw, 32rem) max-content; grid-template-areas:'heading controls badge'; align-items:stretch; width:fit-content; max-width:100%; padding:0; border-radius:0; background:transparent; box-shadow:none; }
  .map-header-card { grid-area:heading; display:flex; flex-direction:column; justify-content:center; align-self:stretch; padding:.8rem 1rem; border-radius:20px; background:#fff8ef; box-shadow:0 4px 16px rgba(35,25,65,.08); }
  .map-header-card .gol-eyebrow { margin-bottom:.25rem; font-size:.82rem; }
  .map-header-card .gol-title { font-size:2.28rem; }
  .map-control-stack { --map-search-control-height:3.375rem; --map-selector-gap:.5rem; grid-area:controls; display:grid; grid-template-columns:minmax(0, 1fr) 3.375rem; min-height:calc(var(--map-search-control-height) * 2 + var(--map-selector-gap)); gap:var(--map-selector-gap) .625rem; align-items:start; }
  .map-search-toolbar { grid-column:1 / -1; display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:.625rem; width:100%; }
  .map-category-anchor { position:relative; grid-column:1; height:var(--map-search-control-height); }
  .map-category-selector { position:absolute; top:0; left:0; z-index:1; }
  .map-next-badge { grid-area:badge; display:flex; min-width:12.75rem; align-self:stretch; align-items:center; padding:.7rem .8rem; border:1px solid rgba(35,25,65,.14); border-radius:20px; background:#fff8ef; box-shadow:0 4px 16px rgba(35,25,65,.12); }
  .map-next-badge .map-hunt-entry__icon { width:2.35rem; height:2.35rem; border-radius:11px; font-size:1.2rem; }
  .map-next-badge small { font-size:.67rem; }
  .map-next-badge strong { font-size:.92rem; }
  .map-next-badge em { font-size:.76rem; }
  .map-next-badge i:not(.bi) { height:6px; }
  .map-next-badge > .bi { font-size:1.05rem; }
}
@media (min-width: 768px) and (max-width: 1099.98px) {
  .map-overlay { width:calc(100% - 3rem); }
  .map-discovery-bar { grid-template-columns:minmax(9rem, .85fr) minmax(14rem, 1.25fr) minmax(8rem, .7fr); gap:.6rem; width:100%; }
  .map-header-card { width:100%; min-width:0; }
  .map-header-card .gol-title { white-space:normal; overflow-wrap:normal; }
  .map-control-stack { min-width:0; }
  .map-next-badge { min-width:0; padding:.6rem; }
}
@media (min-width: 768px) and (max-width: 991.98px) { .map-header-card .gol-title { font-size:1.75rem; }.map-next-badge .map-hunt-entry__icon { width:1.95rem; height:1.95rem; font-size:1rem; }.map-next-badge small { font-size:.6rem; }.map-next-badge strong { font-size:.8rem; }.map-next-badge em { font-size:.68rem; } }
@media (max-width: 767.98px) {
  .map-overlay { top:calc(2.8rem + env(safe-area-inset-top)); left:.75rem; width:calc(100% - 1.5rem); }
  .map-discovery-bar { display:flex; flex-direction:column; align-items:stretch; justify-content:flex-start; gap:.75rem; padding:0; border-radius:0; background:transparent; box-shadow:none; }
  .map-mobile-header-surface { display:grid; grid-template-columns:minmax(0, 1fr) auto; align-items:center; gap:.55rem; padding:.5rem .65rem; border-radius:20px; background:#fff8ef; box-shadow:0 4px 16px rgba(35,25,65,.12); }
  .map-header-card { display:flex; width:auto; max-width:none; min-width:0; padding:0; flex-direction:column; justify-content:center; border-radius:0; background:transparent; box-shadow:none; transition:none; }.map-header-card:hover { transform:none; box-shadow:none; }.map-header-card .gol-eyebrow { font-size:.59rem; }.map-header-card .gol-title { font-size:1.28rem; }
  .map-next-badge { min-width:8.2rem; padding-left:.55rem; align-items:center; }.map-next-badge__main > span:nth-child(2) { gap:.04rem; line-height:1.1; }.map-next-badge .map-hunt-entry__icon { width:1.7rem; height:1.7rem; border-radius:8px; font-size:.9rem; }.map-next-badge strong { font-size:.68rem; }.map-next-badge em { font-size:.58rem; }
  .map-control-stack { --map-search-control-height:3.5rem; --map-selector-gap:.75rem; display:flex; flex:0 0 auto; flex-direction:column; gap:var(--map-selector-gap); width:100%; }.map-search-toolbar { display:grid; grid-template-columns:minmax(0, 1fr) 3rem; gap:.625rem; width:100%; }.map-search-toolbar :deep(.gol-search-bar),.map-search-toolbar :deep(.gol-filter-button) { min-height:var(--map-search-control-height); height:var(--map-search-control-height); }
  .map-category-anchor { position:relative; height:2.85rem; }.map-category-selector { position:absolute; top:0; left:0; z-index:1; width:fit-content; min-width:10rem; max-width:calc(100% - 3.5rem); min-height:2.85rem; }.map-category-selector--expanded { width:calc(100% - 3.5rem); min-height:5.1rem; border-radius:16px; }.map-category-selector__summary { padding:.35rem .45rem .35rem .5rem; font-size:.7rem; }.map-category-selector__sparkle,.map-category-selector__summary > .bi,.map-category-selector__collapse { width:1.9rem; height:1.9rem; }.map-category-selector__rail { gap:.55rem; padding:.35rem .15rem .28rem .5rem; }.map-category-selector .map-category { flex-basis:3.9rem; font-size:.62rem; }.map-category-selector .map-category__icon { width:2.35rem; height:2.35rem; font-size:1rem; }.map-category-selector .map-category--selected .map-category__icon::after { top:-.32rem; right:-.32rem; width:1.08rem; height:1.08rem; font-size:.62rem; }.map-category-selector__collapse { margin-right:.45rem; }
  .map-nearby-row { bottom:calc(5.9rem + env(safe-area-inset-bottom)); left:.75rem; width:calc(100% - 1.5rem); max-width:none; gap:.35rem; }.map-nearby-switch { min-height:2.7rem; padding:0 .55rem; font-size:.7rem; }.map-radius-control { min-width:0; min-height:0; gap:.55rem; padding:.75rem 1rem; font-size:.65rem; }
  .map-activity-card { bottom:calc(6.1rem + env(safe-area-inset-bottom)); }
}

@media (prefers-reduced-motion: reduce) {
  .map-category-card,.map-category-toggle,.map-category-selector,.map-activity-card__close,.map-activity-card__directions,.map-activity-card__view,.map-nearby-switch,.map-radius-control,.map-radius-control__range,.map-nearby-switch__track,.map-nearby-switch__track span { transition: none; }
  .map-motion,.map-category--selected .map-category__icon,:deep(.map-intro-marker),:deep(.map-user-location-marker--intro),.map-intro-dialog { animation: none; }
  .map-selected-card-enter-active,.map-selected-card-leave-active { transition: none; }
}
</style>
