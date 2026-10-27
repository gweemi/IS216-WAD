<script setup>
import { computed } from 'vue'
import { MAP_ACTIVITY_CATEGORY_FALLBACK, getMapActivityCategory } from '@/config/mapActivityCategories'

const props = defineProps({
  activity: { type: Object, required: true },
})

const category = computed(() => getMapActivityCategory(props.activity.category) ?? MAP_ACTIVITY_CATEGORY_FALLBACK)
const label = computed(() => {
  const title = String(props.activity.title ?? 'Activity').trim()
  return title.split(/\s+/).slice(0, 2).join(' ') || 'Activity'
})
</script>

<template>
  <div
    class="gol-activity-marker"
    :style="{ '--activity-color': category.color }"
    :aria-label="`${category.label}: ${activity.title ?? 'Activity'}`"
  >
    <i :class="['bi', category.icon]" aria-hidden="true"></i>
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.gol-activity-marker {
  display: grid;
  width: 58px;
  height: 58px;
  align-content: center;
  justify-items: center;
  border: 4px solid #fff;
  border-radius: 50%;
  background: var(--activity-color);
  box-shadow: 5px 7px 0 rgba(34, 26, 59, 0.25);
  color: var(--gol-ink);
  font-family: var(--gol-font);
  font-size: 0.63rem;
  font-weight: 900;
  line-height: 1.05;
  text-align: center;
  text-transform: uppercase;
}

.gol-activity-marker i { font-size: 0.95rem; line-height: 1; }

.gol-activity-marker span {
  max-width: 43px;
  padding: 0.24rem 0.3rem;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.94);
  transform: rotate(-6deg);
}
</style>
