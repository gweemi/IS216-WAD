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
  <BottomSheet :open="open" label="Delete account" @close="!busy && emit('cancel')">
    <section class="delete-confirm" aria-labelledby="delete-confirm-title" data-testid="delete-account-dialog">
      <p class="gol-eyebrow">This can't be undone</p>
      <h2 id="delete-confirm-title">Delete your account?</h2>
      <p>We'll permanently delete:</p>
      <ul>
        <li>your profile, points, badges and vouchers</li>
        <li>your wellbeing check-ins and reflections</li>
        <li>the OPENJIOs you host, and your spot in ones you joined</li>
        <li>your friends, friend requests and notifications</li>
      </ul>
      <p>Google will ask you to confirm it's you.</p>

      <p v-if="error" class="delete-confirm__error" role="alert">{{ error }}</p>
      <div class="delete-confirm__actions">
        <button type="button" class="gol-btn-soft" :disabled="busy" data-testid="delete-account-cancel" @click="emit('cancel')">Cancel</button>
        <button type="button" class="delete-confirm__go" :disabled="busy"
          data-testid="delete-account-confirm" @click="emit('confirm')">
          {{ busy ? 'Deleting…' : 'Delete account' }}
        </button>
      </div>
    </section>
  </BottomSheet>
</template>

<style scoped>
.delete-confirm h2 { margin: .2rem 0 .65rem; font-size: 1.35rem; font-weight: 900; }
.delete-confirm p:not(.gol-eyebrow), .delete-confirm li { margin: 0; color: var(--gol-muted); font-weight: 700; line-height: 1.45; }
.delete-confirm ul { margin: .35rem 0 .6rem; padding-left: 1.2rem; }
.delete-confirm__error { margin-top: .85rem !important; color: #b4382f !important; }
.delete-confirm__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; margin-top: 1.15rem; }
.delete-confirm__go { border: none; border-radius: 999px; color: #fff; background: #dc4d4d; box-shadow: 0 3px 0 #a83434; font-weight: 850; padding: .55rem 1rem; }
.delete-confirm__go:disabled { opacity: .45; }
</style>
