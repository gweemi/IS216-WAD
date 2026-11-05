<script setup>
import '@/assets/discovery.css'
import BottomSheet from '@/components/common/BottomSheet.vue'
import SheetHeader from '@/components/common/SheetHeader.vue'
import { filters, recommended, resetFilters } from '@/stores/activities'
import { categories } from '@/data/seedActivities'
import { categoryLabel, sourceLabel } from '@/utils/activityStyle'
import { SOURCE_OPTIONS } from '@/utils/activitySource'
import { BUDGETS, HOURS, ENERGY } from '@/utils/activeFilters'
import { REGIONS } from '@/config/regions'
defineProps({
  open: { type: Boolean, default: true },
  showCategories: { type: Boolean, default: true },
  showRegions: { type: Boolean, default: false },
  showSources: { type: Boolean, default: true },
  showNearby: { type: Boolean, default: false },
  nearbyEnabled: { type: Boolean, default: false },
  nearbyRadiusKm: { type: Number, default: 5 },
  nearbyLoading: { type: Boolean, default: false },
  nearbyError: { type: String, default: '' },
  resultCount: { type: Number, default: null },
})
const emit = defineEmits(['close', 'toggle-nearby', 'update:nearbyRadiusKm', 'clear-nearby', 'cleared'])

const SETTINGS = ['Any', 'Indoor', 'Outdoor']
const SOURCES = SOURCE_OPTIONS

function toggle(key, v) {
  const list = filters.value[key]
  filters.value[key] = list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function selectCategory(category) {
  toggle('categories', category)
}

function selectRegion(region) {
  toggle('regions', region)
}

function clearFilters() {
  resetFilters()
  emit('clear-nearby')
  emit('cleared')
}
</script>

<template>
  <BottomSheet :open="open" label="Filters" @close="emit('close')">
    <SheetHeader class="fs-head" eyebrow="Fits your break" title="Tune your vibe" title-class="fs-title" @close="emit('close')" />

    <template v-if="showCategories">
      <h3 class="fs-label">Category</h3>
      <div class="fs-chips">
        <button class="fs-chip" :class="{ on: !filters.categories.length }" @click="filters.categories = []">All</button>
        <button v-for="c in categories" :key="c" class="fs-chip" :class="{ on: filters.categories.includes(c) }"
          @click="selectCategory(c)">{{ categoryLabel(c) }}</button>
      </div>
    </template>

    <template v-if="showRegions">
      <h3 class="fs-label">Area</h3>
      <div class="fs-chips">
        <button class="fs-chip" :class="{ on: !filters.regions.length }" data-testid="map-area-all" @click="filters.regions = []">All Areas</button>
        <button v-for="region in REGIONS" :key="region.id" class="fs-chip" :class="{ on: filters.regions.includes(region.id) }"
          :data-testid="`map-area-${region.id}`" @click="selectRegion(region.id)">{{ region.label }}</button>
      </div>
    </template>

    <template v-if="showSources">
    <h3 class="fs-label">Source</h3>
    <div class="fs-chips">
      <button v-for="s in SOURCES" :key="s" class="fs-chip" :class="{ on: filters.sources.includes(s) }"
        @click="toggle('sources', s)">{{ sourceLabel(s) }}</button>
    </div>
    </template>

    <h3 class="fs-label">Budget</h3>
    <div class="fs-chips">
      <button v-for="[v, label] in BUDGETS" :key="label" class="fs-chip" :class="{ on: filters.maxCost === v }"
        @click="filters.maxCost = v">{{ label }}</button>
    </div>

    <h3 class="fs-label">Time you have</h3>
    <div class="fs-chips">
      <button v-for="[v, label] in HOURS" :key="label" class="fs-chip" :class="{ on: filters.maxHours === v }"
        @click="filters.maxHours = v">{{ label }}</button>
    </div>

    <h3 class="fs-label">Setting</h3>
    <div class="fs-chips">
      <button v-for="s in SETTINGS" :key="s" class="fs-chip" :class="{ on: filters.setting === s }"
        @click="filters.setting = s">{{ s }}</button>
    </div>

    <h3 class="fs-label">Activity level</h3>
    <div class="fs-chips">
      <button v-for="[v, label] in ENERGY" :key="v" class="fs-chip" :class="{ on: filters.energy === v }"
        @click="filters.energy = v">{{ label }}</button>
    </div>

    <h3 class="fs-label">Availability</h3>
    <div class="fs-chips">
      <button class="fs-chip" :class="{ on: filters.onlySlots }" @click="filters.onlySlots = !filters.onlySlots">
        Only show activities with slots
      </button>
    </div>

    <template v-if="showNearby">
      <h3 class="fs-label">Near me</h3>
      <div class="fs-chips fs-near">
        <button class="fs-chip" :class="{ on: nearbyEnabled }" :disabled="nearbyLoading" @click="emit('toggle-nearby')">
          <i class="bi bi-geo-alt"></i> {{ nearbyLoading ? 'Finding your location…' : `Within ${nearbyRadiusKm} km` }}
        </button>
        <input
          v-if="nearbyEnabled"
          :value="nearbyRadiusKm"
          type="range"
          min="1"
          max="20"
          class="form-range fs-range"
          aria-label="Nearby radius in kilometres"
          @input="emit('update:nearbyRadiusKm', Number($event.target.value))"
        />
        <p v-if="nearbyError" class="fs-near-error" role="status">{{ nearbyError }}</p>
      </div>
    </template>

    <div class="fs-actions">
      <button class="fs-clear" @click="clearFilters">Clear</button>
      <button class="gol-btn-primary" @click="emit('close')">Show {{ resultCount ?? recommended.length }} activities</button>
    </div>
  </BottomSheet>
</template>
