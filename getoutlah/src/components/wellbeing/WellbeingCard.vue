<!--
  "My wellbeing" card for the Profile page + its "My wellbeing" history pop-up.
  Usage in the Profile page:  <WellbeingCard />
  It opens the WHO-5 check-in (CheckInSheet) by itself.
-->
<template>
  <section class="gol-card wellbeing-card">
    <!-- Card (matches Figma Profile screen) -->
    <div class="d-flex align-items-center gap-3 mb-2">
      <button class="head-btn d-flex align-items-center gap-3 flex-grow-1" @click="showHistory = true">
        <span class="gol-icon-tile tile-cyan"><i class="bi bi-heart-pulse"></i></span>
        <span class="text-start">
          <span class="d-block card-title">My wellbeing</span>
          <span class="d-block subtitle">{{ subtitle }}</span>
        </span>
      </button>
      <button v-if="due" class="gol-btn-coral" @click="showCheckIn = true">Check-in due</button>
      <button v-else class="gol-btn-soft" @click="showHistory = true">View</button>
    </div>

    <div class="chart-wrap" role="button" tabindex="0" @click="showHistory = true" @keydown.enter="showHistory = true">
      <WellbeingChart :points="store.history" :max="4" />
    </div>

    <!-- History pop-up (matches Figma "My wellbeing" sheet) -->
    <BottomSheet :open="showHistory" label="My wellbeing" @close="showHistory = false">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <p class="gol-eyebrow">Only you can see this</p>
          <h2 class="gol-title">My wellbeing</h2>
        </div>
        <button class="gol-close" aria-label="Close" @click="showHistory = false"><i class="bi bi-x-lg"></i></button>
      </div>

      <div class="gol-card mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h3 class="chart-title mb-0">WHO-5 score over time</h3>
          <span v-if="status" class="gol-pill" :class="'gol-pill--' + status.tone">{{ status.label }}</span>
        </div>
        <WellbeingChart :points="store.history" />
        <p class="caption mb-0 mt-2">Scores above the dotted line (50) mean good wellbeing.</p>
      </div>

      <p v-if="!due && latest" class="text-center caption mb-2">
        Next check-in in {{ daysUntilDue }} day{{ daysUntilDue === 1 ? '' : 's' }}. You can still do one early.
      </p>
      <button class="gol-btn-primary" @click="openCheckInFromHistory">Do my 1-min check-in</button>
    </BottomSheet>

    <CheckInSheet :open="showCheckIn" @close="showCheckIn = false" />
  </section>
</template>

<script>
import BottomSheet from '../common/BottomSheet.vue'
import WellbeingChart from './WellbeingChart.vue'
import CheckInSheet from './CheckInSheet.vue'
import {
  wellbeing,
  latestCheckIn,
  statusFor,
  isCheckInDue,
  daysSinceLastCheckIn,
  shortDate,
  CHECKIN_INTERVAL_DAYS,
} from '../../stores/wellbeing.js'

export default {
  name: 'WellbeingCard',
  components: { BottomSheet, WellbeingChart, CheckInSheet },
  data() {
    return { store: wellbeing, showHistory: false, showCheckIn: false }
  },
  computed: {
    latest() {
      return this.store.history.length ? latestCheckIn() : null
    },
    status() {
      return this.latest ? statusFor(this.latest.score) : null
    },
    due() {
      return this.store.history.length === 0 || isCheckInDue()
    },
    daysUntilDue() {
      return Math.max(0, CHECKIN_INTERVAL_DAYS - daysSinceLastCheckIn())
    },
    subtitle() {
      if (!this.latest) return 'No check-ins yet · takes 1 min'
      return `${this.latest.score}/100 · ${this.status.label} · last check-in ${shortDate(this.latest.date)}`
    },
  },
  methods: {
    openCheckInFromHistory() {
      this.showHistory = false
      setTimeout(() => (this.showCheckIn = true), 260) // wait for the first pop-up to slide away
    },
  },
}
</script>

<style scoped>
.wellbeing-card { font-family: var(--gol-font); color: var(--gol-ink); }
.head-btn { background: none; border: none; padding: 0; color: inherit; font-family: inherit; min-width: 0; }
.tile-cyan { background: var(--gol-cyan); }
.card-title { font-weight: 900; font-size: 1rem; }
.subtitle { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); line-height: 1.3; }
.chart-wrap { cursor: pointer; border-radius: 12px; }
.chart-wrap:focus-visible { outline: 3px solid var(--gol-purple-soft); }
.chart-title { font-weight: 900; font-size: 1rem; }
.caption { font-size: 0.8rem; color: var(--gol-muted); font-weight: 600; }
</style>
