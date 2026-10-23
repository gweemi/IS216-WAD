<!--
  Badges tab: "Your trophy shelf" (matches Figma).
  Add to your router:  { path: '/badges', name: 'badges', component: BadgesView }
  The top "GetOutLah!" bar and bottom nav come from your team's App layout.
-->
<template>
  <main class="gol-page">
    <div class="container py-3 py-md-4 page-inner">
      <header class="mb-3">
        <p class="gol-eyebrow">Collect the chaos</p>
        <h1 class="gol-title">Your trophy shelf</h1>
      </header>

      <div class="row g-3 mb-4">
        <div class="col-12 col-lg-7">
          <StreakCard />
        </div>
        <div class="col-12 col-lg-5">
          <PointsCard />
        </div>
      </div>

      <section>
        <div class="d-flex justify-content-between align-items-baseline mb-3">
          <h2 class="gol-section-title">Badges</h2>
          <span class="earned-count">{{ earnedCount }} of {{ badges.length }} earned</span>
        </div>

        <!-- X-factor: Vue <TransitionGroup>. Badges fade up one by one when the
             page loads, and a newly earned badge slides over to the earned group. -->
        <TransitionGroup tag="div" name="badge-list" appear class="row row-cols-3 row-cols-md-4 row-cols-xl-6 g-3">
          <div v-for="(b, i) in badges" :key="b.id" class="col" :style="{ '--i': i }">
            <BadgeTile :badge="b" @select="selected = b" />
          </div>
        </TransitionGroup>
      </section>
    </div>

    <!-- Badge details pop-up -->
    <BottomSheet :open="!!selected" label="Badge details" @close="selected = null">
      <template v-if="selected">
        <div class="d-flex justify-content-end">
          <button class="gol-close" aria-label="Close" @click="selected = null">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="text-center">
          <div class="sheet-badge mx-auto mb-2">
            <BadgeTile :badge="selected" :celebrate="true" />
          </div>
          <p class="gol-eyebrow">{{ selected.earned ? 'Earned ' + formatDate(selected.earnedOn) : 'Still locked' }}</p>
          <h2 class="gol-title mb-2">{{ selected.name }}</h2>
          <p class="detail-text mb-3">{{ selected.desc }}</p>
          <div class="gol-card text-start mb-3">
            <div class="d-flex justify-content-between fw-bold mb-1">
              <span>Progress</span>
              <span>{{ selected.progress }}/{{ selected.target }}</span>
            </div>
            <div class="gol-progress mb-2">
              <span :style="{ width: (selected.progress / selected.target) * 100 + '%' }"></span>
            </div>
            <div class="small detail-text">Bonus: +{{ selected.bonus }} points (counts towards your weekly cap)</div>
          </div>
          <p class="small detail-text mb-3">No deadline. Go at your own pace.</p>
          <button class="gol-btn-primary" @click="selected = null">Got it</button>
        </div>
      </template>
    </BottomSheet>
  </main>
</template>

<script>
import StreakCard from '../components/badges/StreakCard.vue'
import PointsCard from '../components/badges/PointsCard.vue'
import BadgeTile from '../components/badges/BadgeTile.vue'
import BottomSheet from '../components/common/BottomSheet.vue'
import { game, badgeList } from '../stores/gamification(badges).js'

export default {
  name: 'BadgesView',
  components: { StreakCard, PointsCard, BadgeTile, BottomSheet },
  data() {
    return {
      store: game,
      selected: null,
    }
  },
  computed: {
    // Earned badges first, then locked ones (closest to unlocking first)
    badges() {
      return badgeList().sort((a, b) => {
        if (a.earned !== b.earned) return a.earned ? -1 : 1
        if (!a.earned) return b.progress / b.target - a.progress / a.target
        return 0
      })
    },
    earnedCount() {
      return this.badges.filter((b) => b.earned).length
    },
  },
  methods: {
    formatDate(iso) {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    },
  },
}
</script>

<style scoped>
.page-inner { max-width: 1100px; }
.earned-count {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--gol-purple);
}
.sheet-badge { width: 120px; pointer-events: none; }
.sheet-badge :deep(.name),
.sheet-badge :deep(.progress-wrap) { display: none; }
.detail-text { color: var(--gol-muted); font-weight: 600; }

/* <TransitionGroup> animations for the badge grid */
.badge-list-enter-active,
.badge-list-appear-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--i) * 70ms); /* one after another */
}
.badge-list-enter-from,
.badge-list-appear-from {
  opacity: 0;
  transform: translateY(18px) scale(0.85);
}
.badge-list-move {
  transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
}
</style>
