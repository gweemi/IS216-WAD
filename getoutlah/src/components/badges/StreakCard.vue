<!--
  Purple "Weekly streak" card (matches Figma).
  <StreakCard />
-->
<template>
  <section class="streak-card">
    <div class="d-flex justify-content-between align-items-start gap-3">
      <div>
        <p class="streak-eyebrow">Weekly streak</p>
        <h2 class="streak-title">{{ title }}</h2>
        <p class="streak-sub">{{ subtitle }}</p>
      </div>
      <span class="gol-icon-tile streak-icon">
        <i class="bi" :class="paused ? 'bi-pause-fill' : 'bi-stars'"></i>
      </span>
    </div>

    <div class="weeks d-flex gap-2 mt-3" :aria-label="`${streak} week streak`">
      <span
        v-for="w in weeks"
        :key="w.n"
        class="week"
        :class="{ done: w.done, current: w.current }"
        :title="`Week ${w.n}`"
      >
        <i v-if="w.done" class="bi bi-check-lg"></i>
        <span v-else>W{{ w.n }}</span>
      </span>
    </div>
  </section>
</template>

<script>
import { game, currentStreak, doneThisWeek } from '../../stores/gamification(badges).js'

export default {
  name: 'StreakCard',
  data() {
    return { store: game }
  },
  computed: {
    streak() {
      // currentStreak() reads the reactive store, so this updates automatically
      return currentStreak()
    },
    paused() {
      return this.store.studyBreak.active
    },
    title() {
      if (this.streak === 0) return 'Start a streak'
      if (this.streak === 1) return '1 week strong'
      return `${this.streak} weeks strong`
    },
    subtitle() {
      if (this.paused) return 'Paused for study break. Your streak is safe.'
      if (this.streak > 0 && !doneThisWeek()) return 'Do one activity this week to keep it going'
      return 'One activity a week keeps it going'
    },
    // Show weeks in blocks of 7: W1–W7, then W8–W14, ...
    weeks() {
      const start = Math.floor(this.streak / 7) * 7
      return Array.from({ length: 7 }, (_, i) => {
        const n = start + i + 1
        return { n, done: n <= this.streak, current: n === this.streak + 1 }
      })
    },
  },
}
</script>

<style scoped>
.streak-card {
  font-family: var(--gol-font);
  background: var(--gol-purple);
  color: #fff;
  border-radius: 28px;
  padding: 1.25rem;
  height: 100%;
}
.streak-eyebrow {
  color: var(--gol-lime);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 0.2rem;
}
.streak-title {
  font-weight: 900;
  font-size: clamp(1.6rem, 6vw, 2rem);
  margin: 0;
  line-height: 1.1;
}
.streak-sub {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  margin: 0.3rem 0 0;
}
.streak-icon {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  font-size: 1.7rem;
  background: var(--gol-yellow);
  box-shadow: 5px 5px 0 var(--gol-ink);
  transform: rotate(-6deg);
}
.week {
  flex: 1;
  max-width: 52px;
  height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.55);
}
.week.done {
  background: var(--gol-lime);
  color: var(--gol-ink);
  border: 2px solid var(--gol-ink);
  font-size: 0.95rem;
}
.week.current { outline: 2px dashed rgba(255, 255, 255, 0.5); outline-offset: -2px; }
</style>
