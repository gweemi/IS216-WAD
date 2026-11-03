<script setup>
import BottomSheet from '@/components/common/BottomSheet.vue'

defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['cancel', 'confirm'])
</script>

<template>
  <BottomSheet :open="open" label="Confirm log out" @close="!busy && emit('cancel')">
    <section class="logout-confirm" aria-labelledby="logout-confirm-title">
      <p class="gol-eyebrow">Leaving so soon?</p>
      <h2 id="logout-confirm-title">Are you sure you want to log out?</h2>
      <p>You’ll need to sign in again to access your activities and profile.</p>
      <p v-if="error" class="logout-confirm__error" role="alert">{{ error }}</p>
      <div class="logout-confirm__actions">
        <button type="button" class="gol-btn-soft" :disabled="busy" data-testid="logout-cancel" @click="emit('cancel')">Cancel</button>
        <button type="button" class="gol-btn-primary" :disabled="busy" data-testid="logout-confirm" @click="emit('confirm')">
          {{ busy ? 'Logging out…' : 'Log out' }}
        </button>
      </div>
    </section>
  </BottomSheet>
</template>

<style scoped>
.logout-confirm h2 { margin: .2rem 0 .65rem; font-size: 1.35rem; font-weight: 900; }
.logout-confirm p:not(.gol-eyebrow) { margin: 0; color: var(--gol-muted); font-weight: 700; line-height: 1.45; }
.logout-confirm__error { margin-top: .85rem !important; color: #b4382f !important; }
.logout-confirm__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; margin-top: 1.15rem; }
</style>
