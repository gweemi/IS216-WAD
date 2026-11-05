
<template>
  <button
    class="badge-tile"
    :class="{ locked: !badge.earned, popping: popping, 'big-entrance': celebrate && badge.earned }"
    @click="onClick"
  >
    <span ref="ring" class="ring">
      <span class="face" :style="{ background: presentation.color }">
        <span class="badge-emoji" aria-hidden="true">{{ presentation.emoji }}</span>
        <span v-if="badge.earned" class="shine"></span>
      </span>
      <span v-if="!badge.earned" class="locked-tag">LOCKED</span>

      <span v-if="popping" class="burst" aria-hidden="true">
        <span
          v-for="n in 10"
          :key="n"
          class="bit"
          :class="'bit--' + (n % 4)"
          :style="{ '--angle': n * 36 + 'deg', '--delay': (n % 3) * 30 + 'ms' }"
        ></span>
      </span>
    </span>

    <span class="name">{{ badge.name }}</span>

    <span v-if="!badge.earned" class="progress-wrap">
      <span class="gol-progress d-block">
        <span :style="{ width: percent + '%' }"></span>
      </span>
      <span class="progress-text">{{ badge.progress }}/{{ badge.target }} {{ badge.unit }}</span>
    </span>
  </button>
</template>

<script>
import { burstFrom } from '../../utils/celebrate.js'
import { badgePresentation } from '../../stores/gamification(badges).js'

const POP_MS = 700 
const OPEN_DELAY_MS = 420 

export default {
  name: 'BadgeTile',
  props: {
    badge: { type: Object, required: true },
    celebrate: { type: Boolean, default: false },
  },
  emits: ['select'],
  data() {
    return { popping: false, timers: [] }
  },
  computed: {
    percent() {
      return Math.round((this.badge.progress / this.badge.target) * 100)
    },
    presentation() {
      return badgePresentation(this.badge)
    },
  },
  mounted() {
    if (this.celebrate && this.badge.earned) {
      this.timers.push(setTimeout(() => this.pop(), 350))
    }
  },
  beforeUnmount() {
    this.timers.forEach(clearTimeout)
  },
  methods: {
    pop() {
      this.popping = false
      requestAnimationFrame(() => {
        this.popping = true
        this.timers.push(setTimeout(() => (this.popping = false), POP_MS))
      })
    },
    onClick() {
      if (!this.badge.earned) {
        this.$emit('select', this.badge)
        return
      }
      if (this.popping) return 
      this.pop()
      try {
        burstFrom(this.$refs.ring) 
      } catch (e) {}
      this.timers.push(setTimeout(() => this.$emit('select', this.badge), OPEN_DELAY_MS))
    },
  },
}
</script>

<style scoped>
.badge-tile {
  font-family: var(--gol-font);
  color: var(--gol-ink);
  background: none;
  border: none;
  padding: 0.25rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-radius: 16px;
  -webkit-tap-highlight-color: transparent;
}
.badge-tile:focus-visible { outline: 3px solid var(--gol-purple-soft); }

.ring {
  position: relative;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: var(--gol-gold);
  padding: 7px;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.08);
  transition: transform 0.15s;
}
.badge-tile:not(.locked):hover .ring { transform: translateY(-2px) rotate(-3deg); }

.face {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2.5px solid var(--gol-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: var(--gol-ink);
}
.badge-emoji { line-height: 1; }

.name {
  margin-top: 0.55rem;
  font-weight: 900;
  font-size: 0.8rem;
  line-height: 1.2;
}

.popping { position: relative; z-index: 2; }
.popping .ring { animation: badge-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.popping .badge-emoji { animation: icon-wiggle 0.6s ease; }
.popping .name { animation: name-bounce 0.6s ease; }

@keyframes badge-pop {
  0% { transform: scale(1) rotate(0); }
  25% { transform: scale(0.85) rotate(-8deg); }
  55% { transform: scale(1.18) rotate(6deg); }
  80% { transform: scale(0.97) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); }
}
@keyframes icon-wiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  30% { transform: rotate(-18deg) scale(1.15); }
  60% { transform: rotate(14deg) scale(1.2); }
}
@keyframes name-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.shine {
  position: absolute;
  inset: -20%;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.75) 50%, transparent 60%);
  transform: translateX(-120%);
  pointer-events: none;
}
.popping .shine { animation: shine-sweep 0.7s ease-out; }
@keyframes shine-sweep {
  to { transform: translateX(120%); }
}

.burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  border-radius: 2px;
  border: 1.5px solid var(--gol-ink);
  opacity: 0;
  animation: burst-out 0.65s ease-out var(--delay) forwards;
}
.bit--0 { background: var(--gol-lime); }
.bit--1 { background: var(--gol-coral); border-radius: 50%; }
.bit--2 { background: var(--gol-cyan); }
.bit--3 { background: var(--gol-purple); border-radius: 50%; }

@keyframes burst-out {
  0% { opacity: 1; transform: rotate(var(--angle)) translateY(0) scale(0.4); }
  70% { opacity: 1; }
  100% { opacity: 0; transform: rotate(var(--angle)) translateY(-62px) scale(1) rotate(180deg); }
}

.big-entrance .ring { animation: spin-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.big-entrance.popping .ring { animation: badge-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes spin-in {
  from { transform: scale(0.3) rotate(-120deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.locked .ring { background: var(--gol-locked); box-shadow: none; }
.locked .face {
  background: #f6f3fa !important;
  border-color: transparent;
  color: #b3abc2;
}
.locked .badge-emoji { filter: grayscale(1); opacity: 0.58; }
.locked .name { color: var(--gol-muted); }
.locked-tag {
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  background: #4d4560;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
}
.progress-wrap { width: 72%; margin-top: 0.3rem; }
.progress-text {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--gol-muted);
}

@media (prefers-reduced-motion: reduce) {
  .popping .ring { animation: glow-pulse 0.7s ease; }
  .popping .badge-emoji,
  .popping .name { animation: none; }
  .big-entrance .ring { animation: soft-fade-in 0.3s ease both; }
  .big-entrance.popping .ring { animation: glow-pulse 0.7s ease; }
  .bit { display: none; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.08), 0 0 0 0 rgba(255, 212, 77, 0); }
  50% { box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.08), 0 0 0 8px rgba(255, 212, 77, 0.55), 0 0 30px 10px rgba(255, 212, 77, 0.6); }
}
@keyframes soft-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
