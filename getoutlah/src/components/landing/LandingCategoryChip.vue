<script setup>
defineProps({ category: { type: Object, required: true }, index: { type: Number, default: 0 } })
</script>

<template>
  <span class="strip-chip" :style="{ '--r': (index % 2 ? 2 : -2) + 'deg' }">
    <span class="tile tile-sm" :style="{ background: category.color }">{{ category.emoji }}</span>
    {{ category.label }}
  </span>
</template>

<style scoped>
.strip-chip { display: inline-flex; align-items: center; gap: .6rem; background: #fff; font-weight: 900; border: 2px solid var(--gol-ink); border-radius: 999px; padding: .4rem 1.1rem .4rem .45rem; box-shadow: 3px 3px 0 var(--gol-ink); transform: rotate(var(--r)); transition: transform .2s; }
.strip-chip:hover { transform: rotate(0) scale(1.05); }
.tile { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--gol-ink); box-shadow: 2px 2px 0 var(--gol-ink); }
.tile-sm { width: 34px; height: 34px; border-radius: 10px; font-size: 1.05rem; }
.strip-chip:hover .tile { animation: bounce .8s ease-in-out; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(-12px) rotate(8deg); } 55% { transform: translateY(0) scale(1.08, .93); } }
@media (prefers-reduced-motion: reduce) { .strip-chip:hover .tile { animation: none; } }
</style>
