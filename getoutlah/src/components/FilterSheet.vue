<script setup>
import '@/assets/discovery.css'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { filters, recommended, resetFilters } from '@/stores/activities'
import { categories } from '@/data/seedActivities'
import { categoryLabel, sourceLabel } from '@/utils/activityStyle'
import { BUDGETS, HOURS, ENERGY } from '@/utils/activeFilters'
// Works with v-if="open" OR :open="open" (the Map page can use either).
const props = defineProps({
  open: { type: Boolean, default: true },
  singleCategory: { type: Boolean, default: false },
  showNearby: { type: Boolean, default: false },
  nearbyEnabled: { type: Boolean, default: false },
  nearbyRadiusKm: { type: Number, default: 5 },
  nearbyLoading: { type: Boolean, default: false },
  nearbyError: { type: String, default: '' },
  resultCount: { type: Number, default: null },
})
const emit = defineEmits(['close', 'toggle-nearby', 'update:nearbyRadiusKm', 'clear-nearby'])

const SETTINGS = ['Any', 'Indoor', 'Outdoor']
const SOURCES = ['curated', 'eventbrite', 'openjio']   // shown as Curated, Limited, OpenJio (same labels as the cards)

function toggle(key, v) {
  const list = filters.value[key]
  filters.value[key] = list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function selectCategory(category) {
  if (props.singleCategory) {
    filters.value.categories = [category]
    return
  }
  toggle('categories', category)
}

function clearFilters() {
  resetFilters()
  emit('clear-nearby')
}
</script>

<template>
  <BottomSheet :open="open" label="Filters" @close="emit('close')">
    <div class="fs-head">
      <div>
        <div class="gol-eyebrow">Fits your break</div>
        <h2 class="gol-title fs-title">Tune your vibe</h2>
      </div>
      <button class="gol-close" aria-label="Close" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
    </div>

    <h3 class="fs-label">Category</h3>
    <div class="fs-chips">
      <button class="fs-chip" :class="{ on: !filters.categories.length }" @click="filters.categories = []">All</button>
      <button v-for="c in categories" :key="c" class="fs-chip" :class="{ on: filters.categories.includes(c) }"
        @click="selectCategory(c)">{{ categoryLabel(c) }}</button>
    </div>

    <h3 class="fs-label">Type</h3>
    <div class="fs-chips">
      <button v-for="s in SOURCES" :key="s" class="fs-chip" :class="{ on: filters.sources.includes(s) }"
        @click="toggle('sources', s)">{{ sourceLabel(s) }}</button>
    </div>

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
