<template>
  <div v-if="notice" class="start-jio-blocked" data-testid="start-jio-blocked">
    <button type="button" :class="buttonClass" disabled data-testid="start-jio-button">
      <i class="bi bi-plus-lg"></i> {{ label }}
    </button>
    <p class="start-jio-notice mb-0">
      {{ notice.title }}
      <span v-if="notice.detail" class="d-block">{{ notice.detail }}</span>
    </p>
  </div>
  <RouterLink v-else-if="routeTo" :to="routeTo" :class="buttonClass" data-testid="start-jio-button">
    <i class="bi bi-plus-lg"></i> {{ label }}
  </RouterLink>
  <button v-else type="button" :class="buttonClass" data-testid="start-jio-button" @click="open = true">
    <i class="bi bi-plus-lg"></i> {{ label }}
  </button>
  <CreateJioSheet v-if="!notice" :open="open" :prefill="prefill" @close="open = false" @created="onCreated" />
</template>

<script>
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { accountRestriction, startJioNotice } from '@/utils/reports'

export default {
  name: 'StartJioButton',
  components: { CreateJioSheet },
  props: {
    label: { type: String, default: 'Start a jio' },
    prefill: { type: Object, default: null },
    variant: { type: String, default: 'coral' },
    routeTo: { type: [String, Object], default: null },
  },
  emits: ['created'],
  data() {
    return { open: false }
  },
  computed: {
    buttonClass() {
      return { coral: 'gol-btn-coral', primary: 'gol-btn-primary', soft: 'gol-btn-soft' }[this.variant]
    },
    notice() {
      return startJioNotice(accountRestriction(useAuthStore().profile))
    },
  },
  methods: {
    onCreated(id) {
      this.open = false
      this.$emit('created', id)
    },
  },
}
</script>

<style scoped>
.start-jio-blocked { display: inline-flex; flex-direction: column; gap: 0.3rem; }
.start-jio-blocked button:disabled { opacity: 0.5; cursor: not-allowed; }
.start-jio-notice { color: #b4382f; font-weight: 800; font-size: 0.8rem; }
</style>
