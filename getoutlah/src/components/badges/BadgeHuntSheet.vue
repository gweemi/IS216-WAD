<script setup>
import BottomSheet from '@/components/common/BottomSheet.vue'
import SheetHeader from '@/components/common/SheetHeader.vue'
import { badgePresentation } from '@/stores/gamification(badges).js'

defineProps({ open: Boolean, opportunities: { type: Array, default: () => [] }, selectedId: String })
const emit = defineEmits(['close', 'select', 'viewAll'])
const choose = (id) => emit('select', id)
const badgeStyle = (badge) => ({ background: badgePresentation(badge).color })
</script>

<template>
  <BottomSheet :open="open" label="Choose a badge to explore" @close="emit('close')">
    <SheetHeader class="hunt-header" eyebrow="Your next adventure" title="Choose a badge to explore" close-label="Close badge selection" @close="emit('close')" />
    <p class="hunt-copy">Select a badge to highlight activities that bring you closer to earning it. Select it again to stop tracking it.</p>
    <div class="hunt-list">
      <button v-for="badge in opportunities" :key="badge.id" class="hunt-option" :class="{ selected: selectedId === badge.id }" type="button" @click="choose(badge.id)">
        <span class="hunt-icon" :style="badgeStyle(badge)" aria-hidden="true">{{ badgePresentation(badge).emoji }}</span><span class="hunt-option__body"><strong>{{ badge.name }}</strong><span>{{ badge.desc }}</span><span class="hunt-progress"><i :style="{ width: `${(badge.progress / badge.target) * 100}%` }"></i></span><em>{{ badge.progress }}/{{ badge.target }} · {{ badge.remaining }} to go</em></span><i v-if="selectedId === badge.id" class="bi bi-check-circle-fill hunt-check" aria-hidden="true"></i>
      </button>
    </div>
    <button class="gol-btn-soft hunt-view-all" type="button" @click="emit('viewAll')"><i class="bi bi-award" aria-hidden="true"></i> View All Badges</button>
  </BottomSheet>
</template>

<style scoped>
.hunt-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }.hunt-header :deep(.gol-title) { font-size:clamp(1.35rem,5vw,1.8rem); }.hunt-header :deep(.gol-close) { width:2.5rem; height:2.5rem; font-size:1rem; }.hunt-copy { margin:.65rem 0 0; color:var(--gol-muted); font-weight:650; }.hunt-list { display:grid; gap:.65rem; max-height:min(52vh,30rem); margin:1rem 0; overflow-y:auto; }.hunt-option { display:flex; position:relative; gap:.7rem; width:100%; padding:.8rem; text-align:left; border:2px solid #e8dcf6; border-radius:17px; background:#fff; color:var(--gol-ink); }.hunt-option.selected { border-color:var(--gol-purple); background:#f2eaff; }.hunt-icon { display:grid; width:2.55rem; height:2.55rem; place-items:center; flex:0 0 auto; border-radius:12px; font-size:1.25rem; }.hunt-option__body { display:grid; gap:.16rem; min-width:0; padding-right:1.5rem; font-size:.77rem; color:var(--gol-muted); }.hunt-option strong { color:var(--gol-ink); font-size:.9rem; }.hunt-option em { font-style:normal; font-weight:800; }.hunt-progress { height:6px; overflow:hidden; border-radius:99px; background:#e6deee; }.hunt-progress i { display:block; height:100%; border-radius:inherit; background:var(--gol-purple); }.hunt-check { position:absolute; right:.7rem; top:50%; transform:translateY(-50%); color:var(--gol-purple); font-size:1.3rem; }.hunt-view-all { display:flex; width:100%; min-height:2.9rem; align-items:center; justify-content:center; gap:.5rem; }
</style>
