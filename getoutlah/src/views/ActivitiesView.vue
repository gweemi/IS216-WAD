<script setup>
import '@/assets/discovery.css'
import { ref, onMounted } from 'vue'
import { filters, recommended, loadingActivities, sourceErrors, setLocation, loadActivities } from '@/stores/activities'
import { useGeolocation } from '@/composables/useGeolocation'
import ActivityCard from '@/components/ActivityCard.vue'
import FilterSheet from '@/components/FilterSheet.vue'

const { request } = useGeolocation()
const filtersOpen = ref(false)

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

      <div class="act-search">
        <div class="act-input">
          <i class="bi bi-search"></i>
          <input v-model="filters.query" placeholder="Search activities, places..." aria-label="Search activities" />
        </div>
        <button class="act-filter-btn" aria-label="Filters" @click="filtersOpen = true">
          <i class="bi bi-sliders"></i>
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
    </div>

    <FilterSheet :open="filtersOpen" @close="filtersOpen = false" />
  </div>
</template>
