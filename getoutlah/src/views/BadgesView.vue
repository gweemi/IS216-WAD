
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
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
          <h2 class="gol-section-title mb-0">Badges</h2>
          <div class="d-flex flex-column align-items-end gap-3">
            <!-- for the redeem voucher page, sits right above the earned count -->
            <RouterLink :to="{ name: 'vouchers' }" class="btn-voucher" data-testid="redeem-voucher">
              <i class="bi bi-gift-fill"></i> Redeem Voucher
              <span class="voucher-spark" aria-hidden="true"></span>
            </RouterLink>
            <span class="earned-count">{{ earnedCount }} of {{ badges.length }} earned</span>
          </div>
        </div>

        <!-- To make badges fade in -->
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
          <button v-if="!selected.earned && selected.qualifies" class="gol-btn-primary me-2" @click="trackOnMap(selected)"><i class="bi bi-map"></i> Track on Map</button>
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
import { useBadgeHunt } from '@/composables/useBadgeHunt'

const { selectTrackedBadge } = useBadgeHunt()

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
    // show earned badges first, then locked ones at the back 
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
    trackOnMap(badge) {
      selectTrackedBadge(badge.id)
      this.selected = null
      this.$router.push({ name: 'map' })
    },
  },
}
</script>

<style scoped>
.page-inner { max-width: 1100px; }
.earned-count {
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--gol-purple);
}
.sheet-badge { width: 120px; pointer-events: none; }
.sheet-badge :deep(.name),
.sheet-badge :deep(.progress-wrap) { display: none; }
.detail-text { color: var(--gol-muted); font-weight: 600; }

.badge-list-enter-active,
.badge-list-appear-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--i) * 70ms); 
}
.badge-list-enter-from,
.badge-list-appear-from {
  opacity: 0;
  transform: translateY(18px) scale(0.85);
}
.badge-list-move {
  transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
}

/*for the vouchers */
.btn-voucher { position: relative; display: inline-flex; align-items: center; gap: .45rem; font-family: var(--gol-font); font-weight: 900; font-size: .95rem; color: var(--gol-ink); background: var(--gol-yellow); border: 2px solid var(--gol-ink); border-radius: 14px; padding: .5rem 1.1rem; box-shadow: 0 4px 0 var(--gol-ink); text-decoration: none; transition: translate .1s, box-shadow .1s; }
.btn-voucher:hover { translate: 0 -2px; box-shadow: 0 6px 0 var(--gol-ink); color: var(--gol-ink); }
.btn-voucher:active { translate: 0 2px; box-shadow: 0 2px 0 var(--gol-ink); }
.voucher-spark { position: absolute; right: -14px; top: -14px; width: 20px; height: 20px; }
.voucher-spark::before, .voucher-spark::after { content: ''; position: absolute; width: 3px; height: 11px; background: var(--gol-yellow); border-radius: 3px; }
.voucher-spark::before { left: 3px; top: 4px; transform: rotate(-30deg); }
.voucher-spark::after { left: 12px; top: 9px; transform: rotate(40deg); }
</style>
