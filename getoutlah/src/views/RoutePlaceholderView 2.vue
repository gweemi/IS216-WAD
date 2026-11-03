<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
})
</script>

<template>
  <main class="gol-page placeholder-page" data-testid="route-placeholder">
    <section class="gol-card placeholder-card text-center">
      <span class="gol-icon-tile placeholder-icon" aria-hidden="true"><i class="bi" :class="icon"></i></span>
      <p class="gol-eyebrow mt-3">Coming soon</p>
      <h1 class="gol-title">{{ title }}</h1>
      <p class="placeholder-copy mb-0">You are now on {{ $route.path }}.</p>
    </section>
  </main>
</template>

<style scoped>
.placeholder-page { display: grid; min-height: 100%; place-items: center; padding: 2rem 1rem; }
.placeholder-card { width: min(100%, 460px); }
.placeholder-icon { width: 58px; height: 58px; font-size: 1.7rem; background: var(--gol-purple-soft); }
.placeholder-copy { color: var(--gol-muted); }
</style>
