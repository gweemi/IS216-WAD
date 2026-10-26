<!--
  OPENJIO! page (/openjio): browse jios, start your own, join / chope / leave.
  The list updates live: when anyone joins or leaves, every open page sees
  the new spot count straight away (Firestore onSnapshot, in stores/openjio.js).
-->
<template>
  <main class="gol-page">
    <div class="container py-3 py-md-4 page-inner">
      <header class="d-flex justify-content-between align-items-end gap-3 mb-3">
        <div>
          <p class="gol-eyebrow">The more the merrier</p>
          <h1 class="gol-title">OPENJIO!</h1>
        </div>
        <button type="button" class="gol-btn-coral" data-testid="start-jio" @click="showCreate = true">
          <i class="bi bi-plus-lg"></i> Start a jio
        </button>
      </header>

      <div class="tabs mb-3" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tab === t.id"
          :class="{ active: tab === t.id }"
          :data-testid="'tab-' + t.id"
          @click="tab = t.id"
        >
          {{ t.label }} <span class="count">{{ t.count }}</span>
        </button>
      </div>

      <div v-if="message" class="toast-msg mb-3" role="status" data-testid="jio-message">{{ message }}</div>

      <p v-if="jios.loading" class="state-text">Loading jios…</p>
      <p v-else-if="jios.error" class="state-text text-danger" role="alert">{{ jios.error }}</p>

      <div v-else-if="list.length === 0" class="gol-card text-center p-4" data-testid="jio-empty">
        <h2 class="gol-section-title mb-2">
          {{ tab === 'mine' ? "You haven't joined any jios yet" : 'No jios yet' }}
        </h2>
        <p class="state-text mb-3">Be the first. Someone out there is free too.</p>
        <button type="button" class="gol-btn-soft" @click="showCreate = true">Start a jio</button>
      </div>

      <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
        <div v-for="j in list" :key="j.id" class="col-12 col-md-6 col-xl-4">
          <JioCard :jio="j" :uid="uid" :busy="busyId === j.id" @action="(a) => onAction(a, j)" />
        </div>
      </TransitionGroup>
    </div>

    <CreateJioSheet :open="showCreate" @close="showCreate = false" @created="onCreated" />
  </main>
</template>

<script>
import { mapStores } from 'pinia'
import JioCard from '@/components/openjio/JioCard.vue'
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'
import { useOpenJioStore } from '@/stores/openjio'
import {
  joinJio,
  chopeJio,
  leaveJio,
  leaveQueue,
  cancelJio,
  friendlyJioError,
} from '@/services/openjio'

// What each card button does, and what we tell the user afterwards
const ACTIONS = {
  join: { run: joinJio, done: "You're in! See you there." },
  chope: { run: chopeJio, done: "Choped! If a spot opens up, it's yours." },
  leave: { run: leaveJio, done: 'You left the jio.', confirm: 'Leave this jio?' },
  leaveQueue: { run: leaveQueue, done: 'You left the queue.' },
  cancel: {
    run: cancelJio,
    done: 'Jio cancelled. Everyone will see it is off.',
    confirm: 'Cancel this jio for everyone?',
  },
}

export default {
  name: 'OpenJioView',
  components: { JioCard, CreateJioSheet },
  data() {
    return {
      tab: 'all',
      showCreate: false,
      busyId: null, // the jio whose button is loading
      message: '',
    }
  },
  computed: {
    ...mapStores(useOpenJioStore), // gives this.openjioStore
    jios() {
      return this.openjioStore
    },
    uid() {
      return this.jios.uid
    },
    tabs() {
      return [
        { id: 'all', label: 'Explore', count: this.jios.upcoming.length },
        { id: 'mine', label: 'My jios', count: this.jios.mine.length },
      ]
    },
    list() {
      return this.tab === 'mine' ? this.jios.mine : this.jios.upcoming
    },
  },
  mounted() {
    // Keeps listening after you leave the page, so other pages (e.g. the map)
    // can share the same live list.
    this.jios.start()
  },
  beforeUnmount() {
    clearTimeout(this.messageTimer)
  },
  methods: {
    async onAction(action, jio) {
      const a = ACTIONS[action]
      if (a.confirm && !window.confirm(a.confirm)) return

      this.busyId = jio.id
      try {
        await a.run(jio.id)
        this.flash(a.done)
      } catch (err) {
        this.flash(friendlyJioError(err))
      } finally {
        this.busyId = null
      }
    },
    onCreated() {
      this.showCreate = false
      this.tab = 'mine'
      this.flash('Your OPENJIO is live!')
    },
    flash(text) {
      this.message = text
      clearTimeout(this.messageTimer)
      this.messageTimer = setTimeout(() => (this.message = ''), 4000)
    },
  },
}
</script>

<style scoped>
.page-inner { max-width: 1100px; }
.state-text { color: var(--gol-muted); font-weight: 700; }

.tabs {
  display: inline-flex;
  background: var(--gol-locked);
  border-radius: 999px;
  padding: 0.3rem;
}
.tabs button {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  font-weight: 900;
  background: transparent;
  color: var(--gol-muted);
}
.tabs button.active { background: #fff; color: var(--gol-purple); }
.tabs .count {
  font-size: 0.75rem;
  background: var(--gol-purple-soft);
  color: var(--gol-purple);
  border-radius: 999px;
  padding: 0 0.45rem;
  margin-left: 0.2rem;
}

.toast-msg {
  background: var(--gol-ink);
  color: #fff;
  font-weight: 800;
  border-radius: 16px;
  padding: 0.7rem 1rem;
}

/* Cards slide in and out when the list changes */
.jio-list-enter-active,
.jio-list-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.jio-list-enter-from,
.jio-list-leave-to { opacity: 0; transform: translateY(12px); }
.jio-list-move { transition: transform 0.3s ease; }
</style>
