<script setup>
import '@/assets/discovery.css'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { filters, recommended, loadingActivities, sourceErrors, activityRefreshRequired, openJioLoadError, loadActivities } from '@/stores/activities'
import { activeFilterPills } from '@/utils/activeFilters'
import { ACTIVITY_SOURCES, SOURCE_LABELS, canonicalSource, isActivitySource } from '@/utils/activitySource'
import ActivityCard from '@/components/ActivityCard.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import JioCard from '@/components/openjio/JioCard.vue'
import StartJioCard from '@/components/openjio/StartJioCard.vue'
import JioRow from '@/components/openjio/JioRow.vue'
import { useOpenJioStore } from '@/stores/openjio'

const route = useRoute()
const router = useRouter()
const filtersOpen = ref(false)
const OPENJIO_VIEWS = ['all', 'public', 'friends_only', 'invited']
const jios = useOpenJioStore()
// Source is represented by the page pills above, so do not duplicate it here.
const activePills = computed(() => activeFilterPills(filters.value).filter((pill) => !pill.id.startsWith('source-')))
const selectedSource = computed(() => {
  const source = canonicalSource(route.query.view)
  return isActivitySource(source) ? source : null
})
const openJioVisibility = computed(() => OPENJIO_VIEWS.includes(route.query.visibility) ? route.query.visibility : 'all')
const sourcePills = [
  { value: null, label: 'All Activities' },
  { value: ACTIVITY_SOURCES.PICKS, label: SOURCE_LABELS[ACTIVITY_SOURCES.PICKS] },
  { value: ACTIVITY_SOURCES.EXTERNAL, label: SOURCE_LABELS[ACTIVITY_SOURCES.EXTERNAL] },
  { value: ACTIVITY_SOURCES.OPEN_JIO, label: SOURCE_LABELS[ACTIVITY_SOURCES.OPEN_JIO] },
]
// "Ways to explore": explains where activities come from. Not clickable on purpose;
// the "Browse activities" pills below are the filters.
const sourceCards = [
  { source: ACTIVITY_SOURCES.PICKS, icon: 'ph-sparkle', title: 'GetOutLah Picks', text: 'Handpicked activities by our team.' },
  { source: ACTIVITY_SOURCES.EXTERNAL, icon: 'ph-calendar-dots', title: 'External Listings', text: 'Events from trusted platforms.' },
  { source: ACTIVITY_SOURCES.OPEN_JIO, icon: 'ph-users', title: 'OPENJIO!', text: 'Plans hosted by fellow students.' },
]
const resultsHeading = computed(() => ({
  [ACTIVITY_SOURCES.PICKS]: 'GetOutLah Picks',
  [ACTIVITY_SOURCES.EXTERNAL]: 'Explore External Listings',
  [ACTIVITY_SOURCES.OPEN_JIO]: 'Explore OPENJIOs',
}[selectedSource.value] ?? 'Picked for you'))
const visibilityCopy = computed(() => ({
  all: 'Explore public jios, plans shared by your friends, and activities you’ve been personally invited to.',
  public: 'Discover jios open to everyone on GETOUTLAH! Anyone can join, subject to available spots.',
  friends_only: 'Discover jios your friends have opened to their entire friend circle, including you. No personal invitation needed.',
  invited: 'See jios you’ve been personally invited to. Join, Chope a Spot, or decline the invitation.',
}[openJioVisibility.value]))
const hasAdditionalFilters = computed(() => activePills.value.length > 0 || !!filters.value.query.trim())
const emptyMessage = computed(() => {
  if (selectedSource.value !== ACTIVITY_SOURCES.OPEN_JIO) return 'Nothing matches those filters. Try clearing a few.'
  return {
    all: 'No jios match your current filters. Try adjusting your search or filters.',
    public: 'No public jios match your filters right now.',
    friends_only: 'No friends-only jios match your filters right now.',
    invited: 'No invitations yet! When someone invites you to a jio, you’ll find it here.',
  }[openJioVisibility.value]
})
const jioById = computed(() => new Map(jios.all.map((jio) => [jio.id, jio])))
const shownActivities = computed(() => {
  if (selectedSource.value !== ACTIVITY_SOURCES.OPEN_JIO) return recommended.value
  return recommended.value.filter((activity) => {
    if (openJioVisibility.value === 'all') return true
    if (openJioVisibility.value === 'invited') {
      return ['invite_only', 'friends'].includes(activity.visibility)
        && activity.viewerInvited && activity.viewerRole === 'none'
    }
    return activity.visibility === openJioVisibility.value
  })
})

// OPENJIO! tab: row 1 is jios I host, row 2 is everyone else's
const isOpenJioTab = computed(() => selectedSource.value === ACTIVITY_SOURCES.OPEN_JIO)
const hostingJios = computed(() => shownActivities.value.filter((a) => a.hostedByMe))
const otherJios = computed(() => shownActivities.value.filter((a) => !a.hostedByMe))

function applyRouteSource(source) { filters.value.sources = source ? [source] : [] }
function selectSource(source) { router.push({ name: 'activities', query: source ? { view: source } : {} }) }
function selectOpenJioVisibility(visibility) {
  router.push({ name: 'activities', query: { view: ACTIVITY_SOURCES.OPEN_JIO, ...(visibility === 'all' ? {} : { visibility }) } })
}
function clearSourceView() { router.replace({ name: 'activities' }) }
function reloadPage() { window.location.reload() }
function clearAdditionalFilters() {
  filters.value.query = ''
  filters.value.categories = []
  filters.value.maxCost = null
  filters.value.maxHours = null
  filters.value.setting = 'Any'
  filters.value.energy = 'Any'
  filters.value.onlySlots = false
}

watch(() => route.query.view, () => applyRouteSource(selectedSource.value), { immediate: true })
onMounted(loadActivities)
</script>

<template>
  <div class="gol-page act-page">
    <div class="container py-4 col-lg-12">
      <p class="gol-eyebrow act-location-eyebrow">Explore Singapore</p>
      <h1 class="gol-title">Where we going?</h1>
      <p class="act-intro">From curated finds to student-hosted plans, there’s something for everyone.</p>

      <section class="source-info" aria-labelledby="ways-to-explore">
        <h2 id="ways-to-explore" class="act-label">Ways to explore</h2>
        <ul class="source-cards">
          <li v-for="card in sourceCards" :key="card.source" class="source-card" :class="`source-colour--${card.source}`">
            <span class="source-icon" aria-hidden="true"><i :class="['ph', card.icon]"></i></span>
            <div><h3>{{ card.title }}</h3><p>{{ card.text }}</p></div>
          </li>
        </ul>
      </section>

      <h2 class="act-label act-label--browse">Browse activities</h2>
      <div class="source-pills" role="tablist" aria-label="Activity source">
        <button v-for="pill in sourcePills" :key="pill.label" type="button" role="tab"
          :aria-selected="selectedSource === pill.value" :class="[`source-colour--${pill.value ?? 'all'}`, { on: selectedSource === pill.value }]"
          :data-testid="`source-${pill.value ?? 'all'}`" @click="selectSource(pill.value)">
          {{ pill.label }}
        </button>
      </div>

      <div class="act-search">
        <div class="act-input">
          <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input v-model="filters.query" placeholder="Search activities, places..." aria-label="Search activities" />
        </div>
        <button class="act-filter-btn" aria-label="Filters" @click="filtersOpen = true"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></button>
      </div>
      <div v-if="selectedSource === ACTIVITY_SOURCES.OPEN_JIO" class="openjio-visibility-filter source-pills source-pills--small source-colour--openJio" role="tablist" aria-label="OPENJIO visibility">
        <span class="openjio-visibility-label">Visibility:</span>
        <button v-for="option in [{ id: 'all', label: 'All Jios' }, { id: 'public', label: 'Public' }, { id: 'friends_only', label: 'Friends Only' }, { id: 'invited', label: 'Invited' }]"
          :key="option.id" type="button" role="tab" :aria-selected="openJioVisibility === option.id"
          :class="{ on: openJioVisibility === option.id }" :data-testid="`openjio-visibility-${option.id}`" @click="selectOpenJioVisibility(option.id)">
          {{ option.label }}
        </button>
      </div>
      <div v-if="selectedSource === ACTIVITY_SOURCES.OPEN_JIO" class="openjio-visibility-help">
        <p><i class="ph ph-info" aria-hidden="true"></i> {{ visibilityCopy }}</p>
      </div>

      <div v-if="activePills.length" class="act-active" data-testid="active-filters">
        <button v-for="p in activePills" :key="p.id" class="act-active-pill" :aria-label="`Remove filter: ${p.label}`" @click="p.remove()">
          {{ p.label }} <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <p v-if="loadingActivities" class="act-note">Loading activities…</p>
      <p v-if="activityRefreshRequired" class="act-note act-note--warn" role="status">
        Activity data has been updated. <button type="button" class="act-refresh" @click="reloadPage">Refresh the page</button> to continue.
      </p>
      <p v-for="(msg, source) in sourceErrors" :key="source" class="act-note act-note--warn">Could not load {{ source }}: {{ msg }}</p>
      <p v-if="selectedSource === ACTIVITY_SOURCES.OPEN_JIO && openJioLoadError" class="act-note act-note--warn">Could not load OPENJIOs: {{ openJioLoadError }}</p>

      <div class="act-results-head mt-3 mb-2">
        <h2 class="gol-section-title">{{ resultsHeading }}</h2>
        <div class="act-results-actions">
          <span class="act-count">{{ shownActivities.length }} activities</span>
        </div>
      </div>

      <!-- OPENJIO! tab: two rows that scroll left to right -->
      <template v-if="isOpenJioTab">
        <JioRow title="My Jios" :count="hostingJios.length" test-id="jio-row-hosting">
          <li key="start-jio" data-testid="activities-start-jio"><StartJioCard /></li>
          <li v-for="a in hostingJios" :key="a.id"><JioCard v-if="jioById.get(a.jioId)" :jio="jioById.get(a.jioId)" :uid="jios.uid" link-to-details /><ActivityCard v-else :activity="a" /></li>
        </JioRow>
        <JioRow title="Other Jios" :count="otherJios.length" test-id="jio-row-others"
          :empty-text="!loadingActivities && !otherJios.length ? emptyMessage : ''">
          <li v-for="a in otherJios" :key="a.id"><JioCard v-if="jioById.get(a.jioId)" :jio="jioById.get(a.jioId)" :uid="jios.uid" link-to-details /><ActivityCard v-else :activity="a" /></li>
        </JioRow>
        <button v-if="!otherJios.length && hasAdditionalFilters" type="button" class="act-empty-clear" @click="clearAdditionalFilters">Clear Filters</button>
      </template>

      <TransitionGroup v-else name="activity-card" tag="ul" class="act-list p-0 m-0">
        <li v-for="(a, index) in shownActivities" :key="`${selectedSource ?? 'all'}-${a.id}`" class="list-unstyled"
          :style="{ '--card-stagger': `${Math.min(index, 8) * 35}ms` }">
          <JioCard v-if="a.source === ACTIVITY_SOURCES.OPEN_JIO && jioById.get(a.jioId)" :jio="jioById.get(a.jioId)" :uid="jios.uid" link-to-details />
          <ActivityCard v-else :activity="a" />
        </li>
      </TransitionGroup>
      <div v-if="!isOpenJioTab && !loadingActivities && !shownActivities.length" class="act-empty" role="status">
        <i class="ph ph-compass" aria-hidden="true"></i>
        <p>{{ emptyMessage }}</p>
        <button v-if="hasAdditionalFilters" type="button" class="act-empty-clear" @click="clearAdditionalFilters">Clear Filters</button>
      </div>
    </div>

    <FilterSheet :open="filtersOpen" :show-sources="false" @close="filtersOpen = false" @cleared="clearSourceView" />
  </div>
</template>

<style scoped>
.act-intro { max-width: 44rem; margin: .25rem 0 1.1rem; color: var(--gol-muted); font-weight: 650; }
.act-location-eyebrow { margin-bottom: .22rem; }

/* Section labels: "Ways to explore", "Browse activities" */
.act-label { margin: 0 0 .7rem; font: 900 1.02rem var(--gol-font); color: var(--gol-ink); }

/* One colour per source, shared by the "Ways to explore" icons and the "Browse activities" pills.
   "All Activities" has no source, so it keeps the default purple. */
.source-info, .source-pills { --source-colour: var(--gol-purple); --source-soft: var(--gol-purple-soft); }
.source-colour--all { --source-colour: var(--gol-ink); --source-soft: #ece9f4; }
.source-colour--getoutlahPicks { --source-colour: var(--gol-purple); --source-soft: var(--gol-purple-soft); }
.source-colour--externalListings { --source-colour: #1f6f7d; --source-soft: #dff6fa; }
.source-colour--openJio { --source-colour: #b4382f; --source-soft: #ffe6e0; }

/* "Ways to explore": plain info rows, no border or shadow, so they don't look like buttons */
.source-info { padding-bottom: 1.1rem; margin-bottom: 1.1rem; border-bottom: 1px solid rgba(34, 26, 59, .1); }
.source-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 0; padding: 0; list-style: none; }
.source-card { display: flex; align-items: center; gap: .9rem; }
.source-icon { display: grid; flex: 0 0 3.2rem; width: 3.2rem; height: 3.2rem; place-items: center; border-radius: 14px; font-size: 1.55rem; }
.source-icon { background: var(--source-soft); color: var(--source-colour); }
.source-card h3 { margin: 0; font: 900 1.05rem var(--gol-font); color: var(--gol-ink); }
.source-card p { margin: .15rem 0 0; color: var(--gol-muted); font-size: .86rem; font-weight: 650; line-height: 1.3; }

/* "Browse activities" pills and the OPENJIO visibility pills: outline, filled with the source's colour when selected */
.source-pills { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: .55rem; margin: 0 0 1.2rem; }
.source-pills button { border: 1.5px solid rgba(34, 26, 59, .35); border-radius: 999px; padding: .5rem 1.1rem; background: transparent; color: var(--gol-ink); font: 800 .9rem var(--gol-font); transition: background .16s ease, border-color .16s ease, color .16s ease; }
.source-pills button:hover, .source-pills button:focus-visible { border-color: var(--source-colour); color: var(--source-colour); }
.source-pills button.on { border-color: var(--source-colour); background: var(--source-colour); color: #fff; }
.source-pills--small { align-items: center; margin: .7rem 0 .9rem; }
.source-pills--small button { padding: .35rem .85rem; font-size: .8rem; }
.openjio-visibility-label { color: var(--gol-muted); font-size: .83rem; font-weight: 900; }
.openjio-visibility-help { margin: -.25rem 0 .95rem; color: var(--gol-muted); font-size: .82rem; font-weight: 650; }
.openjio-visibility-help p { display: flex; align-items: flex-start; gap: .35rem; max-width: 52rem; margin: 0 0 .3rem; }
.openjio-visibility-help i { flex: 0 0 auto; margin-top: .1rem; color: var(--gol-purple); font-size: 1rem; }
.openjio-visibility-help a { color: var(--gol-purple); font-weight: 850; text-decoration: none; }
.openjio-visibility-help a:hover, .openjio-visibility-help a:focus-visible { text-decoration: underline; }
.act-results-actions { display: flex; align-items: center; gap: .75rem; }
.act-empty { display: grid; justify-items: start; gap: .35rem; padding: 1rem 0; color: var(--gol-muted); font-weight: 750; }
.act-empty > i { color: var(--gol-purple); font-size: 1.45rem; }
.act-empty p { margin: 0; }
.act-empty-clear { border: 2px solid var(--gol-purple); border-radius: 999px; padding: .3rem .7rem; background: transparent; color: var(--gol-purple); font: 800 .8rem var(--gol-font); }

/* Every card is the same height: all rows match the tallest card, and each card fills its cell.
   Long titles and OPENJIO descriptions are cut to 2 lines (the detail page shows them in full)
   so one long card doesn't stretch every row. */
.act-list { grid-auto-rows: 1fr; }
.act-list > li { display: flex; min-width: 0; }
.act-list > li > * { flex: 1; min-width: 0; }
.act-list :deep(.act-title),
.act-list :deep(.jio-title),
.act-list :deep(.jio-desc) {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;
}

/* Cards enter in a quick stagger whenever a new source or filter result is shown. */
.activity-card-enter-active { transition: opacity .32s cubic-bezier(.22, 1.35, .36, 1), transform .32s cubic-bezier(.22, 1.35, .36, 1); transition-delay: var(--card-stagger, 0ms); }
.activity-card-leave-active { position: absolute; transition: opacity .16s ease, transform .16s ease; }
.activity-card-enter-from { opacity: 0; transform: translateY(14px) scale(.97); }
.activity-card-leave-to { opacity: 0; transform: translateY(-7px) scale(.98); }
.activity-card-move { transition: transform .22s ease; }

@media (prefers-reduced-motion: reduce) {
  .activity-card-enter-active, .activity-card-leave-active, .activity-card-move { transition: none; }
}
/* Results heading + count: wraps onto two lines on phones instead of squashing */
.act-results-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: .4rem .75rem; }
.act-results-head .gol-section-title { margin: 0; min-width: 0; }

@media (max-width: 767px) { .source-cards { grid-template-columns: 1fr; gap: .8rem; } }

/* Phones: smaller pills so the four source tabs fit in two tidy rows */
@media (max-width: 575.98px) {
  .source-pills { gap: .45rem; }
  .source-pills button { padding: .45rem .85rem; font-size: .84rem; }
  .source-pills--small button { padding: .3rem .7rem; font-size: .78rem; }
  .openjio-visibility-label { flex-basis: 100%; }   /* "Visibility:" on its own line above its pills */
  .source-icon { flex-basis: 2.8rem; width: 2.8rem; height: 2.8rem; font-size: 1.35rem; }
}
</style>
