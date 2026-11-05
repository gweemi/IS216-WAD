<template>
  <BottomSheet :open="state.badges.length > 0" label="New badge">
    <div class="text-center new-badge-pop" data-testid="new-badge-popup">
      <p class="gol-eyebrow">New badge{{ state.badges.length > 1 ? 's' : '' }} unlocked!</p>
      <div class="d-flex justify-content-center flex-wrap gap-3">
        <div v-for="b in state.badges" :key="b.id" class="new-badge-pop__badge">
          <BadgeTile :badge="{ ...b, earned: true }" :celebrate="true" />
          <p class="new-badge-pop__points" data-testid="new-badge-points">{{ pointsText(b) }}</p>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>

<script>
import { reactive } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import BadgeTile from '@/components/badges/BadgeTile.vue'

export const NEW_BADGE_POPUP_MS = 2000
const state = reactive({ badges: [] })
let timer = null
let finish = null

export function pointsText(badge) {
  const given = badge.bonusGiven ?? badge.bonus ?? 0
  if (given >= (badge.bonus ?? 0)) return `+${given} pts`
  return given > 0 ? `+${given} pts (weekly cap reached)` : 'No points: weekly cap reached'
}

export function showNewBadges(badges = []) {
  if (!badges.length) return Promise.resolve()
  clearTimeout(timer)
  finish?.()
  state.badges = badges
  return new Promise((resolve) => {
    finish = resolve
    timer = setTimeout(() => {
      state.badges = []
      finish = null
      resolve()
    }, NEW_BADGE_POPUP_MS)
  })
}

export default {
  name: 'NewBadgePopup',
  components: { BottomSheet, BadgeTile },
  data() {
    return { state }
  },
  methods: { pointsText },
}
</script>

<style scoped>
.new-badge-pop { padding: .5rem 0 .25rem; }
.new-badge-pop__badge { width: 120px; pointer-events: none; }
.new-badge-pop__badge :deep(.progress-wrap) { display: none; }
.new-badge-pop__badge :deep(.name) { font-weight: 900; }
.new-badge-pop__points { margin: .2rem 0 0; font-size: .8rem; font-weight: 800; color: var(--gol-purple); }
</style>
