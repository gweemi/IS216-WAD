<!--
  Drop-in "Start a jio" button for any page. It opens the create form itself.
    <StartJioButton />
    <StartJioButton label="OpenJio this" :prefill="{ title: a.title, location: a.location }" />
    <StartJioButton label="OpenJio at this time" :prefill="{ startAt: slotStart, visibility: 'friends' }" />
  Emits `created` with the new jio's id.
-->
<template>
  <!-- Change code is necessary: suspended or banned users get a disabled button and the reason -->
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
// Change code is necessary: check whether the user is suspended or banned (see utils/reports.js)
import { useAuthStore } from '@/stores/auth'
import { accountRestriction, startJioNotice } from '@/utils/reports'

export default {
  name: 'StartJioButton',
  components: { CreateJioSheet },
  props: {
    label: { type: String, default: 'Start a jio' },
    prefill: { type: Object, default: null },
    // 'coral' (default), 'primary' or 'soft': the team's button styles
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
    // Change code is necessary: null if the user can start jios, otherwise the lines to show
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
/* Change code is necessary: disabled button + suspension notice */
.start-jio-blocked { display: inline-flex; flex-direction: column; gap: 0.3rem; }
.start-jio-blocked button:disabled { opacity: 0.5; cursor: not-allowed; }
.start-jio-notice { color: #b4382f; font-weight: 800; font-size: 0.8rem; }
</style>
