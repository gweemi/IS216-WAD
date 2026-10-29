<!--
  One pop-up used for "Saved", "Completed" and "My plans" on the Profile page.
  items: [{ key, title, category, meta, to, pill, mood }]
    meta = small grey line under the title, pill = small label on the right,
    mood = emoji shown on the right (completed activities), to = where tapping goes.
  removeLabel: when set, each row gets a small button that emits "remove"
    (rows with removable: false don't get one).
-->
<script setup>
import { useRouter } from 'vue-router'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { categoryColor, categoryEmoji } from '@/utils/activityStyle'

defineProps({
  open: { type: Boolean, default: false },
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Nothing here yet.' },
  emptyCta: { type: Object, default: null }, // { to, label }
  removeLabel: { type: String, default: '' },
  removeIcon: { type: String, default: 'bi-x-lg' },
})
const emit = defineEmits(['close', 'remove'])
const router = useRouter()

function go(to) {
  if (!to) return
  emit('close')
  router.push(to)
}
</script>

<template>
  <BottomSheet :open="open" :label="title" @close="emit('close')">
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <p v-if="eyebrow" class="gol-eyebrow">{{ eyebrow }}</p>
        <h2 class="gol-title">{{ title }}</h2>
      </div>
      <button class="gol-close" aria-label="Close" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
    </div>

    <TransitionGroup v-if="items.length" tag="ul" name="row" class="list-unstyled d-grid gap-2 mb-0">
      <li v-for="item in items" :key="item.key" class="row-card">
        <button class="row-main" :disabled="!item.to" @click="go(item.to)">
          <span class="row-emoji" :style="{ background: categoryColor(item.category) }">{{ categoryEmoji(item.category) }}</span>
          <span class="flex-grow-1 min-w-0 text-start">
            <span class="d-block row-title">{{ item.title }}</span>
            <span v-if="item.meta" class="d-block row-meta">{{ item.meta }}</span>
          </span>
          <span v-if="item.pill" class="gol-pill row-pill">{{ item.pill }}</span>
          <span v-if="item.mood" class="row-mood" :title="item.mood.label">{{ item.mood.emoji }}</span>
        </button>
        <button
          v-if="removeLabel && item.removable !== false"
          class="row-remove"
          :aria-label="removeLabel + ': ' + item.title"
          :title="removeLabel"
          @click="emit('remove', item)"
        >
          <i class="bi" :class="removeIcon"></i>
        </button>
      </li>
    </TransitionGroup>

    <div v-else class="empty text-center">
      <p class="mb-3">{{ emptyText }}</p>
      <button v-if="emptyCta" class="gol-btn-primary" @click="go(emptyCta.to)">{{ emptyCta.label }}</button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.min-w-0 { min-width: 0; }
.row-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 3px 0 var(--gol-card-edge);
}
.row-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-grow: 1;
  min-width: 0;
  border: none;
  background: none;
  padding: 0.7rem 0.85rem;
  color: var(--gol-ink);
  font-family: var(--gol-font);
  border-radius: 18px;
}
.row-main:not(:disabled):hover { background: var(--gol-purple-soft); }
.row-main:disabled { opacity: 1; cursor: default; }
.row-emoji {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}
.row-title { font-weight: 800; line-height: 1.25; }
.row-meta { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); }
.row-pill { background: var(--gol-purple-soft); color: var(--gol-purple); flex-shrink: 0; }
.row-mood { font-size: 1.5rem; flex-shrink: 0; }
.row-remove {
  border: none;
  background: none;
  color: var(--gol-muted);
  width: 44px;
  align-self: stretch;
  flex-shrink: 0;
  border-radius: 0 18px 18px 0;
}
.row-remove:hover { color: var(--gol-coral-text); }
.empty { color: var(--gol-muted); font-weight: 700; padding: 1.5rem 0.5rem 0.5rem; }

.row-leave-active { transition: opacity 0.2s, transform 0.2s; }
.row-leave-to { opacity: 0; transform: translateX(24px); }
.row-move { transition: transform 0.25s; }
</style>
