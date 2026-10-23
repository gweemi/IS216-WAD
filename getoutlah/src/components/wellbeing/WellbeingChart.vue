<!--
  Line chart of WHO-5 scores. Plain SVG, no chart library needed.
  <WellbeingChart :points="history" />   history = [{ date, score }]
-->
<template>
  <div class="gol-chart">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="ariaLabel"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Green "good wellbeing" zone above 50 -->
      <rect :x="padL - 12" :y="top" :width="plotW + 24" :height="y(50) - top" rx="6" class="zone" />
      <!-- Dotted line at 50 -->
      <line :x1="padL - 12" :x2="padL + plotW + 12" :y1="y(50)" :y2="y(50)" class="threshold" />
      <text :x="W - 4" :y="y(50) + 4" text-anchor="end" class="threshold-label">50</text>

      <!-- The line -->
      <polyline v-if="shown.length > 1" :points="linePoints" class="line" />

      <!-- Dots, values and dates -->
      <g v-for="(p, i) in shown" :key="p.date">
        <circle :cx="x(i)" :cy="y(p.score)" r="7.5" class="dot" />
        <text :x="x(i)" :y="y(p.score) - 13" text-anchor="middle" class="value">{{ p.score }}</text>
        <text :x="x(i)" :y="H - 4" text-anchor="middle" class="date">{{ fmt(p.date) }}</text>
      </g>

      <text v-if="!shown.length" :x="W / 2" :y="H / 2" text-anchor="middle" class="date">
        No check-ins yet
      </text>
    </svg>
  </div>
</template>

<script>
import { shortDate } from '../../stores/wellbeing.js'

export default {
  name: 'WellbeingChart',
  props: {
    points: { type: Array, default: () => [] },
    max: { type: Number, default: 6 }, // how many recent check-ins to show
  },
  data() {
    return { W: 320, H: 170, padL: 24, padR: 30, top: 8, bottomAxis: 26 }
  },
  computed: {
    shown() {
      return this.points.slice(-this.max)
    },
    plotW() {
      return this.W - this.padL - this.padR
    },
    plotBottom() {
      return this.H - this.bottomAxis
    },
    // Zoom the y-axis around the data (always including 50) so changes are visible
    domain() {
      const scores = this.shown.map((p) => p.score).concat(50)
      const lo = Math.max(0, Math.min(...scores) - 25)
      const hi = Math.min(100, Math.max(...scores) + 20)
      return [lo, hi]
    },
    linePoints() {
      return this.shown.map((p, i) => `${this.x(i)},${this.y(p.score)}`).join(' ')
    },
    ariaLabel() {
      return 'Wellbeing scores: ' + this.shown.map((p) => `${this.fmt(p.date)} ${p.score}`).join(', ')
    },
  },
  methods: {
    x(i) {
      const n = this.shown.length
      if (n <= 1) return this.padL + this.plotW / 2
      return this.padL + (i * this.plotW) / (n - 1)
    },
    y(score) {
      const [lo, hi] = this.domain
      const t = (score - lo) / (hi - lo || 1)
      return this.plotBottom - t * (this.plotBottom - this.top - 18) // 18px headroom for labels
    },
    fmt(iso) {
      return shortDate(iso)
    },
  },
}
</script>

<style scoped>
.gol-chart svg {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--gol-font);
}
.zone { fill: var(--gol-good-zone); }
.threshold { stroke: #b7b0c4; stroke-width: 1.5; stroke-dasharray: 4 4; }
.threshold-label { font-size: 11px; font-weight: 700; fill: var(--gol-muted); }
.line { fill: none; stroke: var(--gol-teal); stroke-width: 3.5; stroke-linejoin: round; stroke-linecap: round; }
.dot { fill: #fff; stroke: var(--gol-ink); stroke-width: 3; }
.value { font-size: 13px; font-weight: 800; fill: var(--gol-ink); }
.date { font-size: 11px; font-weight: 700; fill: var(--gol-muted); }
</style>
