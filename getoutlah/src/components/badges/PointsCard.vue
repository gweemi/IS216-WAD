<!--
  Points, level and weekly cap. (Not in the Figma yet, but it's
  part of the Points System feature. Remove it if your team wants
  points to stay hidden.)
  <PointsCard />
-->
<template>
  <section class="gol-card points-card h-100">
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="gol-icon-tile tile-lime"><i class="bi bi-lightning-charge-fill"></i></span>
      <div>
        <div class="label">Level {{ level.level }}</div>
        <div class="big">{{ level.points }} <span class="unit">pts</span></div>
      </div>
    </div>

    <div class="row-label">
      <span>Next level</span>
      <span>{{ level.into }}/{{ level.needed }}</span>
    </div>
    <div class="gol-progress mb-3"><span class="bar-purple" :style="{ width: level.percent + '%' }"></span></div>

    <div class="row-label">
      <span>This week</span>
      <span>{{ week }}/{{ cap }}</span>
    </div>
    <div class="gol-progress"><span :style="{ width: weekPercent + '%' }"></span></div>

    <p class="note mb-0 mt-2">
      <template v-if="week >= cap">
        You've hit this week's cap. Keep exploring if you like. Points reset on Monday.
      </template>
      <template v-else>
        Weekly cap keeps things balanced with study and rest.
      </template>
    </p>
  </section>
</template>

<script>
import { game, levelInfo, pointsThisWeek, WEEKLY_POINT_CAP } from '../../stores/gamification(badges).js'

export default {
  name: 'PointsCard',
  data() {
    return { store: game, cap: WEEKLY_POINT_CAP }
  },
  computed: {
    level() {
      return levelInfo()
    },
    week() {
      return pointsThisWeek()
    },
    weekPercent() {
      return Math.min(100, Math.round((this.week / this.cap) * 100))
    },
  },
}
</script>

<style scoped>
.points-card { font-family: var(--gol-font); color: var(--gol-ink); }
.tile-lime { background: var(--gol-lime); }
.label {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gol-purple);
}
.big { font-weight: 900; font-size: 1.6rem; line-height: 1.1; }
.unit { font-size: 0.9rem; color: var(--gol-muted); }
.row-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 0.3rem;
}
.bar-purple { background: var(--gol-purple) !important; }
.note { font-size: 0.75rem; font-weight: 600; color: var(--gol-muted); }
</style>
