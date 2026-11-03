<script setup>
import { computed } from 'vue'
import { getInterest } from '@/config/preferences'

const props = defineProps({ activity: { type: Object, required: true }, blurb: { type: String, required: true } })
defineEmits(['login'])
const category = computed(() => getInterest(props.activity.category) ?? { emoji: '✨', color: 'var(--gol-purple-soft)' })
</script>

<template>
  <article class="card-lip act h-100">
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="tile" :style="{ background: category.color }">{{ category.emoji }}</span>
      <h3 class="act-title">{{ activity.title }}</h3>
    </div>
    <div class="d-flex flex-wrap gap-2 mb-3">
      <span class="pill" :class="'pill-' + activity.energyLevel">{{ ({ low: '🧘 Chill', medium: '🚶 Moderate', high: '⚡ Active' })[activity.energyLevel] }}</span>
      <span class="pill">⏱ {{ activity.durationHrs }} hr</span>
      <span class="pill">{{ activity.cost ? 'S$' + activity.cost : 'Free' }}</span>
    </div>
    <p class="muted act-text">{{ blurb }} 📍 {{ activity.area }} · {{ activity.setting }}</p>
    <button type="button" class="see-details" @click="$emit('login')">Log in to see details →</button>
  </article>
</template>

<style scoped>
.card-lip { background: #fff; border-radius: 26px; box-shadow: 0 6px 0 var(--gol-card-edge); }
.act { display: flex; flex-direction: column; padding: 1.4rem; transition: translate .15s; }
.act:hover { translate: 0 -4px; }
.tile { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 46px; height: 46px; border-radius: 13px; font-size: 1.4rem; border: 2px solid var(--gol-ink); box-shadow: 3px 3px 0 var(--gol-ink); }
.act:hover .tile { animation: bounce .8s ease-in-out; }
.act-title { font-weight: 900; font-size: 1.15rem; line-height: 1.25; margin: 0; }
.muted { color: var(--gol-muted); font-weight: 600; }
.act-text { flex-grow: 1; font-size: .92rem; }
.pill { font-size: .75rem; font-weight: 800; border-radius: 999px; padding: .2rem .65rem; background: var(--gol-bg); }
.pill-low { background: #d8f6f8; }.pill-medium { background: #effbd9; }.pill-high { background: #ffe1da; }
.see-details { align-self: flex-end; background: none; border: none; padding: 0; font-family: var(--gol-font); font-weight: 900; color: var(--gol-purple); }
@keyframes bounce { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-12px) rotate(8deg); } 55% { transform: translateY(0) scale(1.08,.93); } }
@media (prefers-reduced-motion: reduce) { .act:hover .tile { animation: none; } }
</style>
