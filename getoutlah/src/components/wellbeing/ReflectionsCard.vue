<!--
  "My reflections" card for the Profile page (under "My wellbeing").
  Shows activities waiting for a reflection, a mood insight, recent moods
  and notes, and a "What should I do next?" button.
  Usage in the Profile page:  <ReflectionsCard />
-->
<template>
  <section class="gol-card refl-card">
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="gol-icon-tile tile-coral"><i class="bi bi-journal-text"></i></span>
      <div class="flex-grow-1 min-w-0">
        <div class="card-title">My reflections</div>
        <div class="row-meta">{{ insight }}</div>
      </div>
      <span class="private-pill"><i class="bi bi-lock-fill"></i> Private</span>
    </div>

    <!-- Activities waiting for a reflection -->
    <button v-for="p in store.pending" :key="p.activityId" class="pending-row mb-2" @click="openReflect(p)">
      <i class="bi bi-hourglass-split"></i>
      <span class="flex-grow-1 text-start">Reflect on <strong>{{ p.activityTitle }}</strong></span>
      <i class="bi bi-chevron-right"></i>
    </button>

    <!-- Last 8 moods as coloured faces -->
    <div v-if="moodStrip.length" class="d-flex flex-wrap gap-1 mb-3" aria-label="Recent moods">
      <span v-for="r in moodStrip" :key="r.id" class="face" :class="'dot--' + mood(r).color" :title="r.activityTitle + ': ' + mood(r).label">
        <i class="bi" :class="mood(r).icon"></i>
      </span>
    </div>

    <!-- Past reflections (new ones slide in with <TransitionGroup>) -->
    <TransitionGroup tag="ul" name="refl" class="list-unstyled mb-2 d-grid gap-2">
      <li v-for="r in shown" :key="r.id" class="refl-row">
        <span class="face" :class="mood(r) ? 'dot--' + mood(r).color : ''">
          <i class="bi" :class="mood(r) ? mood(r).icon : 'bi-pencil'"></i>
        </span>
        <div class="min-w-0">
          <div class="row-title">{{ r.activityTitle }}</div>
          <div class="row-meta">{{ formatDate(r.date) }}<template v-if="mood(r)"> · {{ mood(r).label }}</template></div>
          <p v-if="r.note" class="row-note mb-0">"{{ r.note }}"</p>
        </div>
      </li>
    </TransitionGroup>

    <p v-if="!store.entries.length" class="row-meta">No reflections yet. You'll be asked after your next check-in.</p>

    <div class="d-flex gap-2 flex-wrap">
      <button v-if="store.entries.length > 3" class="gol-btn-soft" @click="showAll = !showAll">
        {{ showAll ? 'Show less' : `See all ${store.entries.length}` }}
      </button>
      <button v-if="latest && latest.mood" class="gol-btn-soft" @click="openSuggestions">
        <i class="bi bi-stars"></i> What should I do next?
      </button>
    </div>

    <ReflectionSheet :open="sheetOpen" :item="sheetItem" :suggest-from="sheetSuggestFrom" @close="sheetOpen = false" />
  </section>
</template>

<script>
import ReflectionSheet from './ReflectionSheet.vue'
import { reflections, moodInfo, moodInsight, latestReflection } from '../../stores/reflections.js'

export default {
  name: 'ReflectionsCard',
  components: { ReflectionSheet },
  data() {
    return { store: reflections, showAll: false, sheetOpen: false, sheetItem: null, sheetSuggestFrom: null }
  },
  computed: {
    insight() {
      return moodInsight()
    },
    latest() {
      return this.store.entries.length ? latestReflection() : null
    },
    shown() {
      const newestFirst = [...this.store.entries].reverse()
      return this.showAll ? newestFirst : newestFirst.slice(0, 3)
    },
    moodStrip() {
      return this.store.entries.filter((r) => r.mood).slice(-8)
    },
  },
  methods: {
    mood(r) {
      return moodInfo(r.mood)
    },
    formatDate(iso) {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    },
    openReflect(p) {
      this.sheetItem = p
      this.sheetSuggestFrom = null
      this.sheetOpen = true
    },
    openSuggestions() {
      this.sheetItem = null
      this.sheetSuggestFrom = this.latest
      this.sheetOpen = true
    },
  },
}
</script>

<style scoped>
.refl-card { font-family: var(--gol-font); color: var(--gol-ink); }
.min-w-0 { min-width: 0; }
.tile-coral { background: var(--gol-coral); }
.card-title { font-weight: 900; font-size: 1rem; }
.private-pill {
  font-size: 0.7rem; font-weight: 800; color: var(--gol-muted);
  background: var(--gol-bg); border-radius: 999px; padding: 0.2rem 0.6rem; white-space: nowrap;
}
.pending-row {
  width: 100%; display: flex; align-items: center; gap: 0.6rem;
  font-family: var(--gol-font); font-size: 0.88rem; color: var(--gol-ink);
  background: #fff5e0; border: 2px dashed var(--gol-gold); border-radius: 14px; padding: 0.6rem 0.8rem;
}
.face {
  width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--gol-ink); background: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;
}
.dot--coral { background: var(--gol-coral); }
.dot--yellow { background: var(--gol-yellow); }
.dot--cyan { background: var(--gol-cyan); }
.dot--lime { background: var(--gol-lime); }
.refl-row {
  display: flex; gap: 0.7rem; align-items: flex-start;
  background: var(--gol-bg); border-radius: 14px; padding: 0.6rem 0.75rem;
}
.row-title { font-weight: 900; font-size: 0.88rem; }
.row-meta { font-size: 0.75rem; font-weight: 600; color: var(--gol-muted); }
.row-note { font-size: 0.82rem; font-style: italic; margin-top: 0.15rem; }

/* <TransitionGroup>: new reflections slide in at the top */
.refl-enter-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.refl-enter-from { opacity: 0; transform: translateY(-12px); }
.refl-move { transition: transform 0.35s ease; }
</style>
