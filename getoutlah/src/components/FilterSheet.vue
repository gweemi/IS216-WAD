<script setup>
import '@/assets/discovery.css'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { filters, filtered, resetFilters } from '@/stores/activities'
import { categories } from '@/data/seedActivities'
import { categoryLabel } from '@/utils/activityStyle'
// Works with v-if="open" OR :open="open" (the Map page can use either).
defineProps({ open: { type: Boolean, default: true } })
const emit = defineEmits(['close'])

const BUDGETS = [[null, 'Any'], [0, 'Free'], [10, 'Under $10'], [20, 'Under $20'], [50, 'Under $50']]
const HOURS = [[null, 'Any'], [1, '1 hr or less'], [2, '2 hr or less'], [3, '3 hr or less']]
const SETTINGS = ['Any', 'Indoor', 'Outdoor']
const ENERGY = [['Any', 'Any'], ['low', 'Chill'], ['medium', 'Moderate'], ['high', 'High energy']]
const TYPES = [['events', 'Events'], ['outdoor', 'Outdoor'], ['volunteering', 'Volunteering'], ['paid', 'Paid'], ['openjio', 'OpenJio!']]

function toggleType(t) {
  const list = filters.value.types
  filters.value.types = list.includes(t) ? list.filter((x) => x !== t) : [...list, t]
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
      <button class="fs-chip" :class="{ on: filters.category === 'All' }" @click="filters.category = 'All'">All</button>
      <button v-for="c in categories" :key="c" class="fs-chip" :class="{ on: filters.category === c }"
        @click="filters.category = c">{{ categoryLabel(c) }}</button>
    </div>

    <h3 class="fs-label">Type</h3>
    <div class="fs-chips">
      <button v-for="[id, label] in TYPES" :key="id" class="fs-chip" :class="{ on: filters.types.includes(id) }"
        @click="toggleType(id)">{{ label }}</button>
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

    <h3 class="fs-label">Near me</h3>
    <div class="fs-chips fs-near">
      <button class="fs-chip" :class="{ on: filters.nearMe }" @click="filters.nearMe = !filters.nearMe">
        <i class="bi bi-geo-alt"></i> Within {{ filters.radiusKm }} km
      </button>
      <input v-if="filters.nearMe" type="range" min="1" max="20" v-model.number="filters.radiusKm" class="form-range fs-range" />
    </div>

    <div class="fs-actions">
      <button class="fs-clear" @click="resetFilters">Clear</button>
      <button class="gol-btn-primary" @click="emit('close')">Show {{ filtered.length }} activities</button>
    </div>
  </BottomSheet>
</template>
