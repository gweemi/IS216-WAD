<!--
  The OPENJIO! tab: start a jio, see your invites, and manage your jios.
  Used on /openjio and can sit inside the Activities page as its "OpenJio!" view:
    <OpenJioPanel />
  Public jios are not listed here; they show in the main Activities list
  (useOpenJioStore().publicUpcoming).
-->
<template>
  <div class="openjio-panel">
    <section class="start-card mb-4">
      <div>
        <h2 class="gol-section-title mb-1">Got a plan? Jio people along.</h2>
        <p class="muted mb-0">Public jios show up in Activities. Friends-only ones go to the friends you invite.</p>
      </div>
      <StartJioButton @created="onCreated" />
    </section>

    <div v-if="message" class="toast-msg mb-3" role="status" data-testid="jio-message">{{ message }}</div>

    <p v-if="jios.loading" class="muted">Loading jios…</p>
    <p v-else-if="jios.error" class="text-danger fw-bold" role="alert">{{ jios.error }}</p>

    <template v-else>
      <section class="mb-4" data-testid="jio-invites">
        <h2 class="gol-section-title mb-2">
          Invites for you <span class="count">{{ jios.invites.length }}</span>
        </h2>
        <p v-if="!jios.invites.length" class="muted">No invites right now. When a friend invites you to a jio, it shows up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in jios.invites" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>

      <section data-testid="jio-mine">
        <h2 class="gol-section-title mb-2">
          My jios <span class="count">{{ jios.mine.length }}</span>
        </h2>
        <p v-if="!jios.mine.length" class="muted">Jios you host, join or chope will show up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in jios.mine" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>
    </template>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import JioCard from '@/components/openjio/JioCard.vue'
import StartJioButton from '@/components/openjio/StartJioButton.vue'
import { useOpenJioStore } from '@/stores/openjio'

export default {
  name: 'OpenJioPanel',
  components: { JioCard, StartJioButton },
  data() {
    return { message: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore), // gives this.openjioStore
    jios() {
      return this.openjioStore
    },
  },
  mounted() {
    // Keeps listening after you leave, so other pages (Activities, the map)
    // share the same live list.
    this.jios.start()
  },
  beforeUnmount() {
    clearTimeout(this.messageTimer)
  },
  methods: {
    onCreated() {
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
.muted { color: var(--gol-muted); font-weight: 700; }

.start-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: var(--gol-card);
  border-radius: var(--gol-radius);
  box-shadow: 0 6px 0 var(--gol-card-edge);
  padding: 1.1rem 1.25rem;
}

.count {
  font-size: 0.8rem;
  background: var(--gol-purple-soft);
  color: var(--gol-purple);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  vertical-align: middle;
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
