import { computed, ref, watch } from 'vue'
import { badgeById } from '@/stores/gamification(badges).js'

const trackedBadgeId = ref(null)

export function useBadgeHunt() {
  // Earned badges are deliberately never trackable: they have no remaining
  // progress and should disappear from the map's Next badge experience.
  const trackedBadge = computed(() => {
    const badge = trackedBadgeId.value ? badgeById(trackedBadgeId.value) : null
    return badge && !badge.earned ? badge : null
  })
  watch(trackedBadge, (badge) => {
    if (!badge && trackedBadgeId.value) trackedBadgeId.value = null
  })
  const selectTrackedBadge = (id) => {
    const badge = id ? badgeById(id) : null
    trackedBadgeId.value = badge && !badge.earned ? id : null
  }
  const clearTrackedBadge = () => { trackedBadgeId.value = null }
  return { trackedBadgeId, trackedBadge, selectTrackedBadge, clearTrackedBadge }
}
