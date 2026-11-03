<script setup>
import { computed } from 'vue'
import { MAP_ACTIVITY_CATEGORY_FALLBACK, getMapActivityCategory } from '@/config/mapActivityCategories'

const props = defineProps({
  activity: { type: Object, required: true },
  huntEligible: { type: Boolean, default: false },
})

const category = computed(() => getMapActivityCategory(props.activity.category) ?? MAP_ACTIVITY_CATEGORY_FALLBACK)
const huntDelay = computed(() => `-${([...String(props.activity.id ?? '')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10) * .17}s`)
</script>

<template>
  <div
    class="gol-activity-marker"
    :class="{ 'gol-activity-marker--hunt': huntEligible }"
    :style="{ '--activity-color': category.color, '--hunt-delay': huntDelay }"
    :aria-label="`${category.label}: ${activity.title ?? 'Activity'}`"
  >
    <span class="gol-activity-marker__emoji" aria-hidden="true">{{ category.emoji }}</span>
  </div>
</template>

<style scoped>
.gol-activity-marker {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50%;
  background: var(--activity-color);
  box-shadow: 2px 4px 8px rgba(34, 26, 59, 0.28);
  color: var(--gol-ink);
  transition: transform 170ms ease-out, box-shadow 170ms ease-out, outline-color 170ms ease-out;
}

.gol-activity-marker__emoji { font-size: 1.3rem; line-height: 1; }

@media (hover: hover) and (pointer: fine) {
  .gol-activity-marker:hover {
    transform: translateY(-5px) scale(1.06);
    box-shadow: 3px 9px 14px rgba(34, 26, 59, 0.34);
  }
}

.gol-activity-marker--selected {
  outline: 3px solid var(--gol-purple);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px rgba(117, 65, 236, 0.16), 3px 7px 13px rgba(34, 26, 59, 0.34);
  transform: scale(1.08);
}
.gol-activity-marker--hunt { outline: 3px solid var(--gol-yellow); outline-offset: 3px; box-shadow: 0 0 0 5px rgba(255, 224, 117, .38), 3px 7px 13px rgba(34, 26, 59, .34); }
.gol-activity-marker--hunt::after { content: '✦'; position: absolute; right: -8px; top: -10px; color: #d49400; font-size: 1rem; text-shadow: 0 1px #fff; }
.gol-activity-marker--hunt { animation: hunt-bounce 1.15s cubic-bezier(.28,.84,.45,1) var(--hunt-delay) infinite; }
@keyframes hunt-bounce { 0%,100% { transform:translateY(0) scale(1,1); } 18% { transform:translateY(-20px) scale(1.03,.97); } 48% { transform:translateY(0) scale(.94,1.07); } 65% { transform:translateY(-6px) scale(1.01,.99); } 78% { transform:translateY(0) scale(.98,1.03); } }

@media (hover: hover) and (pointer: fine) {
  .gol-activity-marker--selected:hover { transform: translateY(-5px) scale(1.1); }
}

@media (prefers-reduced-motion: reduce) {
  .gol-activity-marker { transition: none; animation: none; }
  .gol-activity-marker:hover, .gol-activity-marker--selected:hover { transform: none; }
}
</style>

<style>
.gol-activity-tooltip {
  z-index: 700;
  max-width: 13rem;
  padding: .45rem .6rem;
  border: 0;
  border-radius: 10px;
  background: #fffdf8;
  box-shadow: 0 4px 14px rgba(34, 26, 59, .2);
  color: var(--gol-ink);
  font-family: var(--gol-font);
  font-size: .76rem;
  line-height: 1.25;
  white-space: normal;
}
.gol-activity-tooltip strong, .gol-activity-tooltip span { display: block; }
.gol-activity-tooltip strong { font-weight: 900; }
.gol-activity-tooltip span { margin-top: .08rem; color: var(--gol-muted); font-size: .68rem; font-weight: 700; }
.gol-activity-tooltip::before { border-top-color: #fffdf8; }
.gol-cluster-marker__inner { position:relative; width:62px; height:62px; }
.gol-cluster-marker--hunt .gol-cluster-marker__inner { animation:hunt-cluster-bounce 1.2s cubic-bezier(.28,.84,.45,1) infinite; filter:drop-shadow(0 0 4px rgba(255,224,117,.9)); }
.gol-cluster-marker--hunt .gol-cluster-marker__front { outline:3px solid #ffe075; outline-offset:3px; border-radius:50%; }
.gol-cluster-marker--hunt .gol-cluster-marker__inner::after { content:'✦'; position:absolute; right:-5px; top:-10px; color:#d49400; font-weight:900; font-size:1rem; text-shadow:0 1px #fff; }
@keyframes hunt-cluster-bounce { 0%,100% { transform:translateY(0) scale(1); } 18% { transform:translateY(-20px) scale(1.03,.97); } 48% { transform:translateY(0) scale(.94,1.07); } 65% { transform:translateY(-6px); } }
@media (prefers-reduced-motion: reduce) { .gol-cluster-marker--hunt .gol-cluster-marker__inner { animation:none; } }
</style>
