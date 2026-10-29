<script setup>
import '@/assets/discovery.css'
import { ref, computed } from 'vue'
import { toggleSaved, isSaved, datesOf } from '@/stores/activities'
import { categoryColor, categoryEmoji, categoryLabel, tileTextColor, priceText, sourceLabel, whenText } from '@/utils/activityStyle'
const props = defineProps({ activity: Object })
const dates = computed(() => datesOf(props.activity))
const imageBroken = ref(false)   // picture didn't load: show the emoji tile instead
</script>

<template>
  <li class="gol-card act-card">
    <router-link :to="`/activities/${dates[0].id}`" class="act-link" aria-label="Open activity">
      <div class="act-tile" :style="{ background: categoryColor(activity.category), color: tileTextColor(activity.category) }">
        <img v-if="activity.imageUrl && !imageBroken" :src="activity.imageUrl" alt="" loading="lazy" class="act-img" @error="imageBroken = true" />
        <span v-else class="act-emoji">{{ categoryEmoji(activity.category) }}</span>
        <span class="act-tag">{{ categoryLabel(activity.category).split(' ')[0] }}</span>
      </div>
      <div class="act-body">
        <div class="gol-eyebrow">{{ activity.area || 'Singapore' }}</div>
        <h3 class="act-title">{{ activity.title }}</h3>
        <div class="act-meta">
          <i class="bi bi-clock"></i> {{ activity.durationHrs ?? '?' }} hr
          <template v-if="activity.setting"> · {{ activity.setting }}</template>
        </div>
        <div v-if="dates[0].startsAt" class="act-meta">
          <i class="bi bi-calendar-event"></i> {{ whenText(dates[0].startsAt) }}
          <span v-if="dates.length > 1" class="act-more-dates">+{{ dates.length - 1 }} more {{ dates.length === 2 ? 'date' : 'dates' }}</span>
        </div>
        <div class="act-pills">
          <span class="gol-pill gol-pill--okay">{{ priceText(activity) }}</span>
          <span class="act-source">{{ sourceLabel(activity.source) }}</span>
          <span v-if="activity.slotsLeft === 0" class="gol-pill gol-pill--support">Full</span>
          <span v-else-if="activity.slotsLeft != null" class="gol-pill gol-pill--good">{{ activity.slotsLeft }} slots left</span>
        </div>
      </div>
    </router-link>
    <button class="act-save" :class="{ on: isSaved(activity.id) }" @click="toggleSaved(activity.id)"
      :aria-label="isSaved(activity.id) ? 'Unsave' : 'Save'">
      <i class="bi" :class="isSaved(activity.id) ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
    </button>
  </li>
</template>
