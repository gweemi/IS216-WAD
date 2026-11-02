<!--
  The OPENJIO! tab: every jio you can see, plus a button to start one.
  Used inside the Activities page ("OpenJio!" view) and on /openjio:
    <OpenJioPanel />
  Sections: Invites for you (friends-only), My jios, and Open jios (public ones you can join).
  The Public / Friends only filter narrows all three. Public jios also show in the
  main Activities list (useOpenJioStore().publicUpcoming).
-->
<template>
  <div class="openjio-panel">
    <section class="start-card mb-3">
      <div>
        <h2 class="gol-section-title mb-1">Got a plan? Jio people along.</h2>
        <p class="muted mb-0">
          <span class="vis-tag vis-tag--public"><i class="ph ph-globe-hemisphere-west"></i> Public</span> anyone can join, also shown in All activities.
          <span class="vis-tag vis-tag--friends ms-1"><i class="ph ph-lock"></i> Friends only</span> only friends you invite.
        </p>
      </div>
      <StartJioButton @created="onCreated" />
    </section>

    <div class="vis-filter mb-3" role="tablist" aria-label="Show public or friends-only jios">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        type="button"
        role="tab"
        :aria-selected="filter === f.id"
        :class="{ on: filter === f.id }"
        :data-testid="'jio-filter-' + f.id"
        @click="filter = f.id"
      >
        <i v-if="f.icon" class="ph" :class="f.icon"></i> {{ f.label }} <span class="count">{{ counts[f.id] }}</span>
      </button>
    </div>

    <div v-if="message" class="toast-msg mb-3" role="status" data-testid="jio-message">{{ message }}</div>

    <p v-if="jios.loading" class="muted">Loading jios…</p>
    <p v-else-if="jios.error" class="text-danger fw-bold" role="alert">{{ jios.error }}</p>

    <template v-else>
      <section v-if="filter !== 'public'" class="mb-4" data-testid="jio-invites">
        <h2 class="gol-section-title mb-2">
          Invites for you <span class="count">{{ invites.length }}</span>
        </h2>
        <p v-if="!invites.length" class="muted">No invites right now. When a friend invites you to a jio, it shows up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in invites" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>

      <section class="mb-4" data-testid="jio-mine">
        <h2 class="gol-section-title mb-2">
          My jios <span class="count">{{ mine.length }}</span>
        </h2>
        <p v-if="!mine.length" class="muted">Jios you host, join or chope will show up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in mine" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>

      <section v-if="filter !== 'friends'" data-testid="jio-open">
        <h2 class="gol-section-title mb-2">
          Open jios <span class="count">{{ open.length }}</span>
        </h2>
        <p v-if="!open.length" class="muted">No public jios to join right now. Start one and it shows up here and in All activities.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in open" :key="j.id" class="col-12 col-md-6 col-xl-4">
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

const FILTERS = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'public', label: 'Public', icon: 'ph-globe-hemisphere-west' },
  { id: 'friends', label: 'Friends only', icon: 'ph-lock' },
]

export default {
  name: 'OpenJioPanel',
  components: { JioCard, StartJioButton },
  data() {
    return { FILTERS, filter: 'all', message: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore), // gives this.openjioStore
    jios() {
      return this.openjioStore
    },
    invites() {
      return this.pick(this.jios.invites)
    },
    mine() {
      return this.pick(this.jios.mine)
    },
    open() {
      return this.pick(this.jios.openToJoin)
    },
    // How many jios each filter shows (across all sections)
    counts() {
      const every = [...this.jios.invites, ...this.jios.mine, ...this.jios.openToJoin]
      return {
        all: every.length,
        public: every.filter((j) => j.visibility === 'public').length,
        friends: every.filter((j) => j.visibility === 'friends').length,
      }
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
    pick(list) {
      return this.filter === 'all' ? list : list.filter((j) => j.visibility === this.filter)
    },
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

.vis-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 999px;
  padding: 0.05rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 900;
}
.vis-tag--public { background: #e3f4ff; color: #1d5f8a; }
.vis-tag--friends { background: var(--gol-purple-soft); color: var(--gol-purple); }

.vis-filter { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.vis-filter button {
  border: 2px solid var(--gol-card-edge);
  background: var(--gol-card);
  color: var(--gol-muted);
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
  font-weight: 900;
  font-family: var(--gol-font);
}
.vis-filter button.on { border-color: var(--gol-purple); color: var(--gol-purple); }

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
