<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { filtered, filters, loadActivities, oneCardPerEvent, weatherAt } from '@/stores/activities'
import { useGeolocation } from '@/composables/useGeolocation'
import { useMapIntroState } from '@/composables/useMapIntroState'
import { completeMapOnboarding } from '@/services/mapOnboarding'
import { useAuthStore } from '@/stores/auth'
import { INTERESTS } from '@/config/preferences'
import { clearActivityClusterLayer, createActivityClusterLayer, populateActivityClusterLayer, setActivityMarkerSelected } from '@/utils/activityMapMarkers'
import { focusMapOnActivity } from '@/utils/mapActivityFocus'
import { directionsUrl } from '@/services/maps'
import { categoryColor, categoryEmoji, categoryLabel, priceText } from '@/utils/activityStyle'
import { distanceMeters } from '@/utils/geo'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { setMapIntroActive } = useMapIntroState()
const mapElement = ref(null)
const filtersOpen = ref(false)
const categoriesCollapsed = ref(false)
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
const mapOverlay = ref(null)
const categoryCard = ref(null)
const collapsedCategory = ref(null)
const categoryCardWidth = ref(null)
const { coords: locationCoords, error: locationError, loading: locationLoading, request: requestLocation, clear: clearLocation } = useGeolocation()
const replayOnboarding = import.meta.env.DEV && route.query.replayIntro === '1'
const onboardingEligible = Boolean(auth.isLoggedIn && (replayOnboarding || !auth.profile?.mapOnboardingCompleted))
if (!onboardingEligible) onboardingStage.value = 'completed'
const onboardingActive = computed(() => onboardingStage.value !== 'completed')
const showActivityMarkers = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 1)
const showHeader = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 2)
const showDiscoveryControls = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 3)
const showMapControls = computed(() => onboardingStage.value === 'completed' || discoveryStep.value >= 4)
const activities = computed(() => {
  const ungrouped = filtered.value
  const nearby = !nearMeEnabled.value || !locationCoords.value
    ? ungrouped
    : ungrouped.filter((activity) => activity.lat != null && activity.lng != null && distanceMeters(locationCoords.value, activity) <= nearbyRadiusKm.value * 1000)
  return oneCardPerEvent(nearby)
})
const categories = computed(() => [{ id: 'all', label: 'All', emoji: '✦', color: '#7541EC' }, ...INTERESTS])
const selectedCategories = computed(() => categories.value.filter((category) =>
  category.id !== 'all' && filters.value.categories.includes(category.id),
))
const selectedCategory = computed(() => {
  const selectedId = filters.value.categories.length === 1 ? filters.value.categories[0] : 'all'
  return categories.value.find((category) => category.id === selectedId) ?? categories.value[0]
})
const hasMultipleCategoriesSelected = computed(() => selectedCategories.value.length > 1)
const collapsedCategoryLabel = computed(() => {
  if (hasMultipleCategoriesSelected.value) return `${selectedCategories.value.length} categories selected`
  return selectedCategory.value.id === 'all' ? 'All Categories' : selectedCategory.value.label
})
const categoryCardStyle = computed(() => categoryCardWidth.value ? { width: `${categoryCardWidth.value}px` } : {})
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
let map
let clusterLayer
let userLocationMarker
let nearbyRadiusCircle
let temporaryLocationMarker
let categoryResizeObserver
let activityMarkers = new Map()
let locationRequestId = 0
let onboardingRunId = 0
let tileReadyTimer
let tileLayer

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

async function persistOnboardingCompletion() {
  if (replayOnboarding) return
  try {
    await completeMapOnboarding()
  } catch {
    // The completed visual state remains usable. A later visit may retry saving.
  }
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
      persistOnboardingCompletion()
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
  persistOnboardingCompletion()
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

function renderActivityMarkers(items) {
  if (!clusterLayer || !showActivityMarkers.value) return
  const markers = populateActivityClusterLayer(L, clusterLayer, items, { onSelect: selectActivity })
  activityMarkers = new Map(markers.map((marker) => [marker.__activityId, marker]))
  if (selectedActivity.value) setActivityMarkerSelected(activityMarkers.get(selectedActivity.value.id), true)
}

function selectActivity(activity) {
  if (selectedActivity.value?.id !== activity.id) {
    setActivityMarkerSelected(activityMarkers.get(selectedActivity.value?.id), false)
  }
  selectedImageBroken.value = false
  selectedActivity.value = activity
  setActivityMarkerSelected(activityMarkers.get(activity.id), true)
  focusMapOnActivity(map, activity, {
    isMobile: isMobileViewport(),
    reducedMotion: prefersReducedMotion(),
  })
}

function clearSelectedActivity() {
  setActivityMarkerSelected(activityMarkers.get(selectedActivity.value?.id), false)
  selectedActivity.value = null
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

function updateCategoryCardWidth() {
  const expandedWidth = mapOverlay.value?.clientWidth ?? 0
  const compactWidth = Math.max(collapsedCategory.value?.scrollWidth ?? 0, 166)
  categoryCardWidth.value = categoriesCollapsed.value ? compactWidth : (expandedWidth || null)
}

function toggleCategories() {
  categoriesCollapsed.value = !categoriesCollapsed.value
}

watch([categoriesCollapsed, collapsedCategoryLabel], async () => {
  nextTick(updateCategoryCardWidth)
})

watch(onboardingStage, (stage) => {
  if (stage === 'locationPrompt') nextTick(() => introEnableButton.value?.focus())
})

watch(nearbyPromptOpen, (open) => {
  if (open) nextTick(() => nearbyEnableButton.value?.focus())
})

watch([nearMeEnabled, nearbyRadiusKm, locationCoords], () => {
  updateNearbyRadiusCircle()
})

onMounted(async () => {
  map = L.map(mapElement.value, { minZoom: MIN_MAP_ZOOM, maxZoom: MAX_MAP_ZOOM, zoomControl: false }).setView([1.3521, 103.8198], 12)
  syncMapZoom()
  map.on('zoomend', syncMapZoom)

  tileLayer = L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4uab_1_d012b4d2248d7dced0dc5dc2', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: MAX_MAP_ZOOM,
    minZoom: MIN_MAP_ZOOM,
    maxZoom: MAX_MAP_ZOOM,
  }).addTo(map)

  clusterLayer = createActivityClusterLayer(L)
  clusterLayer.addTo(map)
  nextTick(updateCategoryCardWidth)
  window.addEventListener('resize', updateCategoryCardWidth)
  if (typeof ResizeObserver !== 'undefined' && mapOverlay.value) {
    categoryResizeObserver = new ResizeObserver(updateCategoryCardWidth)
    categoryResizeObserver.observe(mapOverlay.value)
  }
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
})

watch(activities, (items) => {
  renderActivityMarkers(items)
  if (selectedActivity.value && !items.some((activity) => activity.id === selectedActivity.value.id)) {
    clearSelectedActivity()
  }
}, { deep: true })

onBeforeUnmount(() => {
  onboardingRunId += 1
  locationRequestId += 1
  window.clearTimeout(tileReadyTimer)
  removeTemporaryLocationMarker()
  removeNearbyRadiusCircle()
  setMapIntroActive(false)
  disableNearby()
  window.removeEventListener('resize', updateCategoryCardWidth)
  categoryResizeObserver?.disconnect()
  if (clusterLayer) clearActivityClusterLayer(clusterLayer)
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
      v-if="showMapControls"
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

    <div v-if="showHeader || showDiscoveryControls" ref="mapOverlay" class="map-overlay">
      <header v-if="showHeader" class="map-header-card map-overlay__card map-motion map-motion--header" @pointerdown.stop @mousedown.stop @dblclick.stop @touchstart.stop>
        <p class="gol-eyebrow">Explore Singapore</p>
        <h1 class="gol-title">Where we going?</h1>
      </header>

      <form v-if="showDiscoveryControls" class="map-search-toolbar map-overlay__card map-motion map-motion--search" role="search" @pointerdown.stop @mousedown.stop @dblclick.stop @touchstart.stop @submit.prevent>
        <SearchBar
          v-model="filters.query"
          placeholder="Search activities, places..."
          label="Search activities and places"
        />
        <FilterButton label="Open activity filters" icon="bi-sliders" @click="filtersOpen = true" />
      </form>

      <section
        v-if="showDiscoveryControls"
        class="map-nearby-row map-motion map-motion--nearby"
        aria-label="Nearby activity controls"
        @pointerdown.stop
        @mousedown.stop
        @dblclick.stop
        @touchstart.stop
      >
        <button
          class="map-nearby-switch"
          :class="{ 'map-nearby-switch--active': nearMeEnabled }"
          type="button"
          role="switch"
          :aria-checked="nearMeEnabled"
          :disabled="locationLoading"
          :aria-label="nearMeEnabled ? 'Turn off Near me' : 'Turn on Near me'"
          :aria-valuetext="nearMeEnabled ? `Near me on within ${nearbyRadiusKm} kilometres` : 'Near me off'"
          data-testid="map-nearby-toggle"
          @click="toggleNearby"
        >
          <span class="map-nearby-switch__label"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> Near me</span>
          <span class="map-nearby-switch__track" aria-hidden="true"><span></span></span>
        </button>
        <label
          class="map-radius-control"
          :class="{ 'map-radius-control--disabled': !nearMeEnabled }"
          :style="{ '--radius-progress': `${((nearbyRadiusKm - 1) / 29) * 100}%` }"
        >
          <span class="map-radius-control__heading"><span>Distance</span><strong>{{ nearbyRadiusKm }} km</strong></span>
          <input
            :value="nearbyRadiusKm"
            class="map-radius-control__range"
            type="range"
            min="1"
            max="30"
            step="1"
            :disabled="!nearMeEnabled"
            :aria-label="`Nearby distance: ${nearbyRadiusKm} kilometres`"
            :aria-valuetext="`${nearbyRadiusKm} kilometres`"
            data-testid="map-nearby-radius"
            @input="setNearbyRadius"
            @pointerdown.stop
            @mousedown.stop
            @touchstart.stop
          />
        </label>
      </section>

      <section
        v-if="showDiscoveryControls"
        ref="categoryCard"
        class="map-category-card map-overlay__card map-motion map-motion--categories"
        :class="{ 'map-category-card--collapsed': categoriesCollapsed }"
        :style="categoryCardStyle"
        aria-label="Activity category filters"
        @pointerdown.stop
        @mousedown.stop
        @dblclick.stop
        @wheel.stop
        @touchstart.stop
      >
        <div v-show="!categoriesCollapsed" class="map-category-rail" role="group" aria-label="Filter activities by category">
          <button
            v-for="category in categories"
            :key="category.id"
            class="map-category"
            :class="{ 'map-category--selected': isCategorySelected(category.id), 'map-category--all': category.id === 'all' }"
            type="button"
            :aria-pressed="isCategorySelected(category.id)"
            :aria-label="category.id === 'all' ? 'Show all activity categories' : `Toggle ${category.label} activities`"
            :data-testid="`map-category-${category.id}`"
            @click="selectCategory(category.id)"
          >
            <span class="map-category__icon" :style="{ background: category.color }" aria-hidden="true">{{ category.emoji }}</span>
            <span class="map-category__label">{{ category.label }}</span>
          </button>
        </div>
        <div v-show="categoriesCollapsed" ref="collapsedCategory" class="map-category-summary">
          <span v-if="!hasMultipleCategoriesSelected" class="map-category-summary__icon" :style="{ background: selectedCategory.color }" aria-hidden="true">{{ selectedCategory.emoji }}</span>
          <span>{{ collapsedCategoryLabel }}</span>
        </div>
        <button
          class="map-category-toggle"
          type="button"
          :aria-label="categoriesCollapsed ? 'Expand categories' : 'Collapse categories'"
          :aria-expanded="!categoriesCollapsed"
          data-testid="map-category-toggle"
          @click="toggleCategories"
        >
          <i class="bi" :class="categoriesCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
        </button>
      </section>
    </div>

    <p v-if="showActivityMarkers && !activities.length" class="map-empty" role="status">
      {{ nearMeEnabled ? `No activities found within ${nearbyRadiusKm} km. Increase the distance, adjust filters, or turn off Near me.` : 'No activities match these filters. Try another category or filter.' }}
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
          </div>
        </div>
        <div class="map-activity-card__actions">
          <a v-if="selectedDirections" :href="selectedDirections" target="_blank" rel="noopener" class="map-activity-card__directions">
            <i class="bi bi-signpost-split" aria-hidden="true"></i> Directions
          </a>
          <button type="button" class="map-activity-card__view" @click="openSelectedActivity"><i class="bi bi-arrow-up-right" aria-hidden="true"></i> View Activity</button>
        </div>
      </section>
    </Transition>
    <FilterSheet
      v-if="showMapControls"
      :open="filtersOpen"
      :show-categories="false"
      :result-count="activities.length"
      @close="filtersOpen = false"
    />

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
  z-index: 1001;
  bottom: 7.25rem;
  left: 1.5rem;
  width: min(46rem, calc(100% - 3rem));
  padding: 1.35rem;
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
.map-activity-card__main { display: flex; gap: 1rem; padding-right: 1.5rem; }
.map-activity-card__image { display: grid; width: 8.5rem; height: 8.5rem; flex: 0 0 auto; place-items: center; overflow: hidden; border-radius: 22px; color: var(--gol-ink); font-size: 3.25rem; }
.map-activity-card__image img { width: 100%; height: 100%; object-fit: cover; }
.map-activity-card__content { min-width: 0; }
.map-activity-card__area { margin: 0 0 .25rem; color: var(--gol-muted); font-size: .84rem; font-weight: 700; }
.map-activity-card__content h2 { margin: 0; padding-right: 1.2rem; font-size: clamp(1.15rem, 3vw, 1.7rem); font-weight: 900; line-height: 1.15; }
.map-activity-card__meta,.map-activity-card__weather,.map-activity-card__description { margin: .42rem 0 0; color: var(--gol-muted); font-weight: 700; line-height: 1.35; }
.map-activity-card__weather { color: var(--gol-ink); }
.map-activity-card__description { font-size: .88rem; }
.map-activity-card__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1rem; }
.map-activity-card__directions,.map-activity-card__view { display: inline-flex; min-height: 3.25rem; align-items: center; justify-content: center; gap: .55rem; border-radius: 18px; font: 800 1rem var(--gol-font); text-decoration: none; }
.map-activity-card__directions { border: 0; background: #fff; color: var(--gol-ink); }
.map-activity-card__view { border: 0; background: var(--gol-purple); box-shadow: inset 0 -4px 0 var(--gol-purple-dark); color: #fff; }
.map-activity-card__view:focus-visible,.map-activity-card__directions:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
.map-selected-card-enter-active,.map-selected-card-leave-active { transition: opacity .24s ease, transform .28s cubic-bezier(.34, 1.56, .64, 1); }
.map-selected-card-enter-from,.map-selected-card-leave-to { opacity: 0; transform: translateY(28px) scale(.96); }

@media (hover: hover) and (pointer: fine) {
  .map-header-card:hover,.map-category-card:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(35, 25, 65, .13); }
  .map-search-toolbar :deep(.gol-search-bar):hover { transform: translateY(-1px); }
  .map-nearby-switch:hover,.map-radius-control:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(35, 25, 65, .18); }
  .map-category:hover .map-category__icon { transform: translateY(-3px) rotate(4deg); }
  .map-category-toggle:hover { transform: translateY(calc(-50% - 3px)); }
  .map-activity-card__close:hover { transform: translateY(-2px); }
  .map-activity-card__directions:hover,.map-activity-card__view:hover { transform: translateY(-2px); filter: brightness(1.03); }
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

.map-zoom-control {
  position: absolute;
  z-index: 1001;
  top: 1.5rem;
  right: 1.5rem;
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
.map-zoom-control__range::-webkit-slider-thumb { width: var(--zoom-thumb-size); height: var(--zoom-thumb-size); margin-left: calc((var(--zoom-track-width) - var(--zoom-thumb-size)) / 2); appearance: none; border: 3px solid #fff; border-radius: 50%; background: var(--gol-purple); box-shadow: 0 2px 5px rgba(35, 25, 65, .25); }
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
  .map-zoom-control { display: none; }
  .map-activity-card { bottom: calc(5.75rem + env(safe-area-inset-bottom)); left: .75rem; width: calc(100% - 1.5rem); padding: 1rem; border-radius: 24px; }
  .map-activity-card__main { gap: .75rem; padding-right: 1rem; }
  .map-activity-card__image { width: 5.75rem; height: 5.75rem; border-radius: 18px; font-size: 2.4rem; }
  .map-activity-card__content h2 { font-size: 1.1rem; }
  .map-activity-card__description { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .map-activity-card__actions { gap: .55rem; margin-top: .8rem; }
  .map-activity-card__directions,.map-activity-card__view { min-height: 3rem; font-size: .88rem; }
  .map-intro-backdrop { align-items: end; padding: 1rem 1rem calc(6.75rem + env(safe-area-inset-bottom)); }
  .map-intro-dialog { border-radius: 22px; }

  :deep(.leaflet-bottom.leaflet-right) {
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-category-card,.map-category-toggle,.map-activity-card__close,.map-activity-card__directions,.map-activity-card__view,.map-nearby-switch,.map-radius-control,.map-radius-control__range,.map-nearby-switch__track,.map-nearby-switch__track span { transition: none; }
  .map-motion,.map-category--selected .map-category__icon,:deep(.map-intro-marker),:deep(.map-user-location-marker--intro),.map-intro-dialog { animation: none; }
  .map-selected-card-enter-active,.map-selected-card-leave-active { transition: none; }
}
</style>
