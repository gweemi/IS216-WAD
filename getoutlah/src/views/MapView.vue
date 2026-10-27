<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import FilterButton from '@/components/common/FilterButton.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { allActivities, loadActivities } from '@/stores/activities'
import { clearActivityClusterLayer, createActivityClusterLayer, populateActivityClusterLayer } from '@/utils/activityMapMarkers'

const mapElement = ref(null)
const searchQuery = ref('')
const activities = allActivities
const MAX_MAP_ZOOM = 18
let map
let clusterLayer

function renderActivityMarkers(items) {
  if (clusterLayer) populateActivityClusterLayer(L, clusterLayer, items)
}

onMounted(async () => {
  map = L.map(mapElement.value, { maxZoom: MAX_MAP_ZOOM, zoomControl: false }).setView([1.3521, 103.8198], 12)

  L.control.zoom({ position: 'topright' }).addTo(map)

  L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4uab_1_d012b4d2248d7dced0dc5dc2', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: MAX_MAP_ZOOM,
    maxZoom: MAX_MAP_ZOOM,
  }).addTo(map)

  clusterLayer = createActivityClusterLayer(L)
  clusterLayer.addTo(map)
  renderActivityMarkers(activities.value)
  await loadActivities()
})

watch(activities, renderActivityMarkers, { deep: true })

onBeforeUnmount(() => {
  if (clusterLayer) clearActivityClusterLayer(clusterLayer)
  map?.remove()
  clusterLayer = null
  map = null
})
</script>

<template>
  <main class="gol-page map-page">
    <header class="container-md px-4 px-md-3 pt-3 pt-md-4 mb-3">
      <p class="gol-eyebrow">Explore Singapore</p>
      <h1 class="gol-title">Where we going?</h1>
      <form class="d-flex align-items-center gap-2 mt-3 map-search-toolbar" role="search" @submit.prevent>
        <SearchBar
          v-model="searchQuery"
          placeholder="Search activities, places..."
          label="Search activities and places"
        />
        <FilterButton label="Open activity filters" icon="bi-sliders" />
      </form>
    </header>
    <div class="container-md px-0 px-md-3 map-shell">
      <div ref="mapElement" class="leaflet-map" aria-label="Interactive map of Singapore" data-testid="leaflet-map"></div>
    </div>
  </main>
</template>

<style scoped>
.map-page {
  min-height: 100%;
}

.map-search-toolbar { max-width: 42rem; }

.map-shell { display: flex; }

:deep(.gol-activity-marker-wrapper),
:deep(.gol-cluster-marker-wrapper) {
  border: 0;
  background: transparent;
}

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

:deep(.gol-activity-popup) {
  display: grid;
  gap: 0.2rem;
  min-width: 150px;
  color: var(--gol-ink);
  font-family: var(--gol-font);
}

:deep(.gol-activity-popup strong) { font-weight: 900; }
:deep(.gol-activity-popup span) { color: var(--gol-muted); font-size: 0.78rem; font-weight: 700; }

.leaflet-map {
  width: 100%;
  height: clamp(26rem, 75dvh, 48rem);
  overflow: hidden;
}

@media (max-width: 767.98px) {
  .map-page {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }

  .map-shell { flex: 1 1 auto; }
  .leaflet-map { height: auto; flex: 1 1 auto; }

  :deep(.leaflet-bottom.leaflet-right) {
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
  }
}

@media (min-width: 768px) {
  .map-page { padding-bottom: 1.5rem; }

  .leaflet-map {
    min-height: 34rem;
    height: calc(100dvh - 14rem);
    max-height: 50rem;
    border: 2px solid var(--gol-card-edge);
    border-radius: var(--gol-radius);
    box-shadow: 0 8px 24px rgba(34, 26, 59, 0.16);
  }
}
</style>
