<script setup>
import '@/assets/discovery.css'
import { ref, computed, onMounted } from 'vue'
import { filters, recommended, loadingActivities, sourceErrors, setLocation, loadActivities } from '@/stores/activities'
import { activeFilterPills } from '@/utils/activeFilters'
import { useGeolocation } from '@/composables/useGeolocation'
import ActivityCard from '@/components/ActivityCard.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import OpenJioPanel from '@/components/openjio/OpenJioPanel.vue'

const { request } = useGeolocation()
const filtersOpen = ref(false)
const view = ref('all') // 'all' = everything, 'openjio' = start a jio, invites, my jios
const activePills = computed(() => activeFilterPills(filters.value))

onMounted(async () => {
  loadActivities()
  setLocation(await request())
})
</script>

<template>
  <div class="gol-page act-page">
    <div class="container py-4 col-lg-12">
      <!-- <div class="gol-eyebrow">Term break mode</div> -->
      <h1 class="gol-title">Where we going?</h1>

      <div class="act-views" role="tablist" aria-label="Activities or OpenJio">
        <button type="button" role="tab" :aria-selected="view === 'all'" :class="{ on: view === 'all' }"
          data-testid="view-all" @click="view = 'all'">All activities</button>
        <button type="button" role="tab" :aria-selected="view === 'openjio'" :class="{ on: view === 'openjio' }"
          data-testid="view-openjio" @click="view = 'openjio'">OpenJio!</button>
      </div>

      <OpenJioPanel v-if="view === 'openjio'" class="mt-3" />

      <template v-else>

      <div class="act-search">
        <div class="act-input">
          <i class="bi bi-search"></i>
          <input v-model="filters.query" placeholder="Search activities, places..." aria-label="Search activities" />
        </div>
        <button class="act-filter-btn" aria-label="Filters" @click="filtersOpen = true">
          <i class="bi bi-sliders"></i>
        </button>
      </div>

      <div v-if="activePills.length" class="act-active" data-testid="active-filters">
        <button v-for="p in activePills" :key="p.id" class="act-active-pill" :aria-label="`Remove filter: ${p.label}`" @click="p.remove()">
          {{ p.label }} <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>

      <div class="form-check form-switch act-switch">
        <input id="free-time" class="form-check-input gol-switch" type="checkbox" role="switch" v-model="filters.prioritiseFreeTime" />
        <label class="form-check-label" for="free-time">Prioritise activities that fit my free time</label>
      </div>

      <p v-if="loadingActivities" class="act-note">Loading activities…</p>
      <p v-for="(msg, source) in sourceErrors" :key="source" class="act-note act-note--warn">
        Could not load {{ source }}: {{ msg }}
      </p>

      <div class="d-flex justify-content-between align-items-baseline mt-3 mb-2">
        <h2 class="gol-section-title">Picked for you</h2>
        <span class="act-count">{{ recommended.length }} activities</span>
      </div>

      <ul class="act-list p-0 m-0">
        <ActivityCard v-for="a in recommended" :key="a.id" :activity="a" />
      </ul>
      <p v-if="!loadingActivities && !recommended.length" class="act-note">
        Nothing matches those filters. Try clearing a few.
      </p>
      </template>
    </div>

    <FilterSheet :open="filtersOpen" @close="filtersOpen = false" />
  </div>
</template>

<style scoped>
.act-views {
  display: inline-flex;
  margin-top: 0.9rem;
  padding: 0.3rem;
  border-radius: 999px;
  background: var(--gol-locked);
}
.act-views button {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  background: transparent;
  color: var(--gol-muted);
  font-family: var(--gol-font);
  font-weight: 900;
}
.act-views button.on { background: #fff; color: var(--gol-purple); }
</style>
