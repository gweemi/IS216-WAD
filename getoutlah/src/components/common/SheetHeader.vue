<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  titleClass: { type: [String, Array, Object], default: '' },
  closeLabel: { type: String, default: 'Close' },
})
const emit = defineEmits(['close'])
</script>

<template>
  <div class="sheet-header">
    <div class="sheet-header__content">
      <div v-if="eyebrow" class="gol-eyebrow">{{ eyebrow }}</div>
      <h2 class="gol-title" :class="titleClass">{{ title }}</h2>
    </div>
    <button type="button" class="gol-close" :aria-label="closeLabel" @click="emit('close')">
      <i class="bi bi-x-lg" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.sheet-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.sheet-header__content { min-width: 0; }
</style>
