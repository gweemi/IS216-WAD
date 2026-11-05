<!--
  Pop-up with a green tick and a message, used after checking in and after joining a jio.
  Only the X closes it (tapping outside or Esc does nothing).
    <SuccessPopup :open="done" title="You have been jioed" @close="done = false">
      ...optional buttons...
    </SuccessPopup>
-->
<template>
  <BottomSheet :open="open" :label="title">
    <div class="d-flex justify-content-end">
      <button type="button" class="gol-close" aria-label="Close" data-testid="success-popup-close" @click="$emit('close')">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="text-center success-pop" data-testid="success-popup">
      <i class="bi bi-check-circle-fill success-pop__tick" aria-hidden="true"></i>
      <h2 class="success-pop__title">{{ title }}</h2>
      <slot></slot>
    </div>
  </BottomSheet>
</template>

<script>
import BottomSheet from '@/components/common/BottomSheet.vue'

export default {
  name: 'SuccessPopup',
  components: { BottomSheet },
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
  },
  emits: ['close'],
}
</script>

<style scoped>
.success-pop { padding: .5rem 0 .25rem; }
.success-pop__tick { display: flex; justify-content: center; width: 100%; font-size: 3.5rem; color: #2fa96b; line-height: 1; margin-bottom: .6rem; }
.success-pop__title { font-size: 1.3rem; font-weight: 900; margin: 0 0 1.1rem; }
</style>
