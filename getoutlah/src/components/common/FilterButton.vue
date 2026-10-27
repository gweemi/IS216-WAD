<script setup>
defineProps({
  label: { type: String, default: 'Open filters' },
  icon: { type: String, default: 'bi-sliders' },
})

defineEmits(['click'])
</script>

<template>
  <button
    class="btn gol-filter-button flex-shrink-0"
    type="button"
    :aria-label="label"
    data-testid="map-filter-button"
    @click="$emit('click', $event)"
  >
    <i class="bi" :class="icon" aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.gol-filter-button {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--gol-purple);
  box-shadow: inset 0 -4px 0 var(--gol-purple-dark);
  font-size: 1.1rem;
}

.gol-filter-button:hover { color: #fff; background: var(--gol-purple-dark); }
.gol-filter-button:focus-visible { outline: 3px solid var(--gol-yellow); outline-offset: 3px; }
</style>
