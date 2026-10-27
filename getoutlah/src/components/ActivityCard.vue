<script setup>
import '@/assets/discovery.css'
import { toggleSaved, isSaved } from '@/stores/activities'
import { categoryColor, categoryEmoji, categoryLabel, tileTextColor, priceText, sourceLabel } from '@/utils/activityStyle'
defineProps({ activity: Object })
</script>

<template>
  <li class="gol-card act-card">
    <router-link :to="`/activities/${activity.id}`" class="act-link" aria-label="Open activity">
      <div class="act-tile" :style="{ background: categoryColor(activity.category), color: tileTextColor(activity.category) }">
        <span class="act-emoji">{{ categoryEmoji(activity.category) }}</span>
        <span class="act-tag">{{ categoryLabel(activity.category).split(' ')[0] }}</span>
      </div>
      <div class="act-body">
        <div class="gol-eyebrow">{{ activity.area || 'Singapore' }}</div>
        <h3 class="act-title">{{ activity.title }}</h3>
        <div class="act-meta">
          <i class="bi bi-clock"></i> {{ activity.durationHrs ?? '?' }} hr
          <template v-if="activity.setting"> · {{ activity.setting }}</template>
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
