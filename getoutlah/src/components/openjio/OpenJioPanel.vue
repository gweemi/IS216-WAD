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
      <div class="start-card__content">
        <h2 class="gol-section-title mb-1">Got a plan? Jio people along!</h2>
        <p class="muted mb-0">Choose who gets to discover and join your plans.</p>
        <div class="visibility-cards" aria-label="OPENJIO visibility options">
          <article class="visibility-card visibility-card--public">
            <i class="ph ph-globe-hemisphere-west" aria-hidden="true"></i>
            <div><h3>Public</h3><p>Anyone on GETOUTLAH! can discover and join.</p></div>
          </article>
          <article class="visibility-card visibility-card--friends">
            <i class="ph ph-users-three" aria-hidden="true"></i>
            <div><h3>Friends Only</h3><p>All accepted friends of the organiser can discover and join without an invitation.</p></div>
          </article>
          <article class="visibility-card visibility-card--invite">
            <i class="ph ph-lock-key" aria-hidden="true"></i>
            <div><h3>Invite Only</h3><p>Only specifically invited users can access and join.</p></div>
          </article>
        </div>
        <div class="start-jio-action">
          <StartJioButton label="Start a Jio" :route-to="{ name: 'openjio-create' }" @created="onCreated" />
        </div>
      </div>
    </section>

    <div v-if="message" class="toast-msg mb-3" role="status" data-testid="jio-message">{{ message }}</div>

    <p v-if="jios.loading" class="muted">Loading jios…</p>
    <p v-else-if="jios.error" class="text-danger fw-bold" role="alert">{{ jios.error }}</p>

    <template v-else>
      <div class="management-tabs" role="tablist" aria-label="OPENJIO management">
        <button type="button" role="tab" :aria-selected="activeSection === 'hosting'" :class="{ on: activeSection === 'hosting' }" data-testid="jio-tab-hosting" @click="activeSection = 'hosting'">
          Hosting <span class="count">{{ hosting.length }}</span>
        </button>
        <button type="button" role="tab" :aria-selected="activeSection === 'going'" :class="{ on: activeSection === 'going' }" data-testid="jio-tab-going" @click="activeSection = 'going'">
          Going <span class="count">{{ going.length }}</span>
        </button>
      </div>

      <section v-if="activeSection === 'hosting'" class="mb-4" data-testid="jio-hosting">
        <h2 class="gol-section-title mb-2">
          Hosting <span class="count">{{ hosting.length }}</span>
        </h2>
        <p v-if="!hosting.length" class="muted">Jios you host will show up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in hosting" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>

      <section v-else data-testid="jio-going">
        <h2 class="gol-section-title mb-2">
          Going <span class="count">{{ going.length }}</span>
        </h2>
        <p v-if="!going.length" class="muted">Jios you join or chope will show up here.</p>
        <TransitionGroup v-else tag="div" name="jio-list" class="row g-3">
          <div v-for="j in going" :key="j.id" class="col-12 col-md-6 col-xl-4">
            <JioCard :jio="j" :uid="jios.uid" />
          </div>
        </TransitionGroup>
      </section>
      <div class="management-links">
        <RouterLink :to="{ name: 'activities', query: { view: 'openJio' } }" class="explore-jios">Explore more Jios</RouterLink>
        <RouterLink v-if="invites.length" :to="{ name: 'activities', query: { view: 'openJio', visibility: 'invited' } }" class="view-invitations">
          View Invitations <span class="count">{{ invites.length }}</span>
        </RouterLink>
      </div>
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
    return { activeSection: 'hosting', message: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore), // gives this.openjioStore
    jios() {
      return this.openjioStore
    },
    invites() {
      return this.jios.invites
    },
    hosting() {
      return this.jios.hosting
    },
    going() {
      return this.jios.going
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
  padding: 0;
}
.start-jio-action { display: flex; margin-top: 1.15rem; }
.start-jio-action :deep(a) { display: inline-flex; align-items: center; text-decoration: none; }
.visibility-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; margin-top: 1rem; }
.visibility-card { display: flex; align-items: flex-start; gap: .65rem; padding: .9rem; border: 2px solid #282047; border-radius: 18px; background: #fff; box-shadow: 0 3px 0 #282047; }
.visibility-card > i { display: grid; flex: 0 0 2.25rem; width: 2.25rem; height: 2.25rem; place-items: center; border-radius: 12px; color: #282047; font-size: 1.3rem; }
.visibility-card h3 { margin: 0; color: #282047; font: 900 1rem var(--gol-font); }
.visibility-card p { margin: .18rem 0 0; color: var(--gol-muted); font-size: .82rem; line-height: 1.3; }
.visibility-card--public > i { background: #bce8fa; }
.visibility-card--friends > i { background: var(--gol-purple-soft); }
.visibility-card--invite > i { background: #ffd3cb; }

.count {
  font-size: 0.8rem;
  background: var(--gol-purple-soft);
  color: var(--gol-purple);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  vertical-align: middle;
}
.management-tabs { display: flex; gap: .6rem; margin: 1.35rem 0 1rem; border-bottom: 2px solid var(--gol-purple-soft); }
.management-tabs button { border: 0; border-bottom: 3px solid transparent; padding: .35rem .15rem .55rem; background: transparent; color: var(--gol-muted); font: 900 1rem var(--gol-font); }
.management-tabs button.on { border-color: var(--gol-purple); color: var(--gol-purple); }
.management-links { display: grid; justify-items: center; gap: .55rem; margin: 1.5rem 0 .5rem; }
.explore-jios, .view-invitations { color: var(--gol-purple); font: 900 1rem var(--gol-font); text-decoration: underline; text-underline-offset: .2em; }
.view-invitations { font-size: .86rem; }

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
@media (max-width: 767px) { .visibility-cards { grid-template-columns: 1fr; } .visibility-card { min-height: auto; } }
</style>
