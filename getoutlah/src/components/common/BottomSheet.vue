<!--
  Reusable sheet: slides up from the bottom on phones,
  shows as a centred pop-up on laptops (768px and wider).
  Usage:
    <BottomSheet :open="showSheet" @close="showSheet = false">
      ...content...
    </BottomSheet>
-->
<template>
  <Teleport to="body">
    <Transition name="gol-sheet">
      <div v-if="open" class="gol-sheet-backdrop" @click.self="$emit('close')">
        <div class="gol-sheet" role="dialog" aria-modal="true" :aria-label="label">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'BottomSheet',
  props: {
    open: { type: Boolean, default: false },
    label: { type: String, default: 'Dialog' },
  },
  emits: ['close'],
  watch: {
    // Stop the page behind from scrolling while the sheet is open
    open(isOpen) {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
    document.body.style.overflow = ''
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape' && this.open) this.$emit('close')
    },
  },
}
</script>

<style scoped>
.gol-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(34, 26, 59, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.gol-sheet {
  font-family: var(--gol-font);
  color: var(--gol-ink);
  background: var(--gol-bg);
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 28px 28px 0 0;
  padding: 1.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
}

/* Laptop: centred card instead of bottom sheet */
@media (min-width: 768px) {
  .gol-sheet-backdrop { align-items: center; }
  .gol-sheet {
    max-width: 480px;
    border-radius: 28px;
    padding: 1.75rem;
  }
}

/* Slide-up animation */
.gol-sheet-enter-active,
.gol-sheet-leave-active { transition: opacity 0.25s ease; }
.gol-sheet-enter-active .gol-sheet,
.gol-sheet-leave-active .gol-sheet { transition: transform 0.25s ease; }
.gol-sheet-enter-from,
.gol-sheet-leave-to { opacity: 0; }
.gol-sheet-enter-from .gol-sheet,
.gol-sheet-leave-to .gol-sheet { transform: translateY(40px); }
</style>
