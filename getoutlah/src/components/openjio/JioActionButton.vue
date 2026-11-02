<!--
  The right button for this user on a jio, and it does the work itself:
    not in it + spots left → Join      not in it + full → Chope next spot
    going → Leave                       queued → Leave queue
    host → Cancel jio                   cancelled / ended → no button
  Pass the jio, or just its id (e.g. on the activity details page):
    <JioActionButton :jio="jio" />
    <JioActionButton :jio-id="activity.jioId" />
-->
<template>
  <div v-if="current && button">
    <button
      type="button"
      :class="['jio-action-button', button.style]"
      :disabled="busy"
      data-testid="jio-action"
      @click="onClick"
    >
      {{ busy ? 'One sec…' : button.label }}
    </button>
    <p v-if="message" class="jio-msg mt-2 mb-0" role="status" data-testid="jio-message">{{ message }}</p>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useOpenJioStore } from '@/stores/openjio'
import { runJioAction, friendlyJioError } from '@/services/openjio'
import { statusOf, myRole } from '@/utils/openjio'

export default {
  name: 'JioActionButton',
  props: {
    jio: { type: Object, default: null },
    jioId: { type: String, default: '' },
    uid: { type: String, default: '' }, // defaults to the logged-in user
  },
  data() {
    return { busy: false, message: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore),
    // The jio passed in, or the live one from the store
    current() {
      return this.jio ?? this.openjioStore.all.find((j) => j.id === this.jioId) ?? null
    },
    me() {
      return this.uid || this.openjioStore.uid
    },
    button() {
      const status = statusOf(this.current)
      const role = myRole(this.current, this.me)
      if (status === 'cancelled' || status === 'ended') return null
      if (role === 'host') return { action: 'cancel', label: 'Cancel jio', style: 'jio-cancel-button w-100' }
      if (role === 'going') return { action: 'leave', label: 'Leave', style: 'gol-btn-soft w-100' }
      if (role === 'queued') return { action: 'leaveQueue', label: 'Leave queue', style: 'gol-btn-soft w-100' }
      if (status === 'full') return { action: 'chope', label: 'Chope next spot', style: 'gol-btn-coral w-100' }
      return { action: 'join', label: 'Join', style: 'gol-btn-primary' }
    },
  },
  mounted() {
    if (!this.jio) this.openjioStore.start() // needed when only an id was given
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    async onClick() {
      this.busy = true
      try {
        const done = await runJioAction(this.button.action, this.current.id)
        if (done) this.show(done)
      } catch (err) {
        this.show(friendlyJioError(err))
      } finally {
        this.busy = false
      }
    },
    show(text) {
      this.message = text
      clearTimeout(this.timer)
      this.timer = setTimeout(() => (this.message = ''), 4000)
    },
  },
}
</script>

<style scoped>
.jio-action-button { min-height: 2.35rem; padding: .45rem .7rem !important; font-size: .8rem !important; line-height: 1.1; }
.jio-action-button.gol-btn-primary { display: inline-flex; align-items: center; justify-content: center; }
.jio-cancel-button { border: none; border-radius: 999px; color: #fff; background: #dc4d4d; box-shadow: 0 3px 0 #a83434; font-weight: 850; }
.jio-cancel-button:hover { filter: brightness(1.05); }
.jio-cancel-button:active { transform: translateY(2px); box-shadow: 0 1px 0 #a83434; }
.jio-msg { font-weight: 800; font-size: 0.85rem; color: var(--gol-purple); }
</style>
