import { computed, ref } from 'vue'
import { badgeById } from '@/stores/gamification(badges).js'

const trackedBadgeId = ref(null)

export function useBadgeHunt() {
  const trackedBadge = computed(() => trackedBadgeId.value ? badgeById(trackedBadgeId.value) : null)
  const selectTrackedBadge = (id) => { trackedBadgeId.value = id ?? null }
  const clearTrackedBadge = () => { trackedBadgeId.value = null }
  return { trackedBadgeId, trackedBadge, selectTrackedBadge, clearTrackedBadge }
}
