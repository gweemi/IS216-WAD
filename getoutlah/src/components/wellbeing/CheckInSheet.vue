<!--
  The 1-minute WHO-5 check-in: intro → 5 questions → result.
  <CheckInSheet :open="showCheckIn" @close="showCheckIn = false" />
-->
<template>
  <BottomSheet :open="open" label="Wellbeing check-in" @close="close">
    <div class="d-flex justify-content-between align-items-start mb-2">
      <p class="gol-eyebrow eyebrow-teal mb-0 pt-2">Wellbeing check-in</p>
      <button class="gol-close" aria-label="Close" @click="close">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- STEP 1: Intro (matches Figma) -->
    <div v-if="step === 'intro'" class="text-center">
      <div class="gol-icon-tile hero-tile mx-auto mb-3"><i class="bi bi-heart-pulse"></i></div>
      <h2 class="gol-title mb-2">How have you been?</h2>
      <p class="muted mb-4">5 quick statements about the last 2 weeks. It takes about a minute.</p>

      <ul class="list-unstyled text-start d-grid gap-2 mb-4">
        <li v-for="item in promises" :key="item.title" class="promise">
          <span class="tick"><i class="bi bi-check-lg"></i></span>
          <div>
            <div class="fw-bold">{{ item.title }}</div>
            <div class="small muted">{{ item.text }}</div>
          </div>
        </li>
      </ul>

      <button class="gol-btn-primary" @click="start">Start check-in</button>
    </div>

    <!-- STEP 2: Questions -->
    <div v-else-if="typeof step === 'number'">
      <div class="d-flex align-items-center gap-2 mb-3">
        <div class="gol-progress flex-grow-1">
          <span class="bar-purple" :style="{ width: ((step + 1) / questions.length) * 100 + '%' }"></span>
        </div>
        <span class="small fw-bold muted">{{ step + 1 }}/{{ questions.length }}</span>
      </div>

      <p class="small fw-bold muted mb-1">Over the last 2 weeks…</p>
      <h2 class="question mb-3">{{ questions[step] }}</h2>

      <div class="d-grid gap-2 mb-3" role="radiogroup" :aria-label="questions[step]">
        <button
          v-for="opt in options"
          :key="opt.value"
          class="option"
          :class="{ selected: answers[step] === opt.value }"
          role="radio"
          :aria-checked="answers[step] === opt.value"
          @click="choose(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <button v-if="step > 0" class="btn btn-link back-link p-0" @click="step--">
        <i class="bi bi-arrow-left"></i> Back
      </button>
    </div>

    <!-- STEP 3: Result -->
    <div v-else-if="step === 'result' && result" class="text-center">
      <div class="score-ring mx-auto mb-3">
        <span class="score">{{ result.score }}</span>
        <span class="out-of">/100</span>
      </div>
      <span class="gol-pill mb-2" :class="'gol-pill--' + status.tone">{{ status.label }}</span>
      <p class="muted mt-2 mb-3">{{ changeText }}</p>

      <!-- Points for checking in (shown on the Badges page as level + points) -->
      <div v-if="reward" class="points-card text-start mb-3" data-testid="checkin-points">
        <span class="points-badge" :class="{ none: !reward.pointsGiven }">
          {{ reward.pointsGiven ? '+' + reward.pointsGiven : '0' }}<small>pts</small>
        </span>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-bold">{{ reward.levelledUp ? 'Level up! You’re now Level ' + level.level : reward.message }}</div>
          <div class="small muted mb-1">Level {{ level.level }} · {{ level.into }}/{{ level.needed }} pts to the next level</div>
          <div class="gol-progress"><span :style="{ width: level.percent + '%' }"></span></div>
        </div>
      </div>

      <!-- Gentle support note for low scores -->
      <div v-if="status.tone === 'support' || status.tone === 'low'" class="support-card text-start mb-3">
        <div class="fw-bold mb-1"><i class="bi bi-chat-heart me-1"></i> It's okay to not be okay</div>
        <p class="small mb-2">
          A score like this can mean the last couple of weeks have been heavy. Talking to someone can
          really help. Your school's counselling service is a good place to start.
        </p>
        <p v-if="status.tone === 'support'" class="small mb-0">
          If you need to talk to someone now, Samaritans of Singapore (SOS) is available 24/7 at
          <a href="tel:1767" class="fw-bold">1767</a>.
        </p>
      </div>

      <!-- "Keep the energy going": a couple of activities to try next -->
      <div v-if="suggestions.length" class="text-start mb-3">
        <h3 class="suggest-title mb-2">{{ status.tone === 'good' || status.tone === 'okay' ? 'Keep the energy going' : 'Something gentle to try' }}</h3>
        <div class="d-grid gap-2">
          <button v-for="a in suggestions" :key="a.id" class="suggest-row" @click="openActivity(a)">
            <span class="suggest-emoji" :style="{ background: categoryColor(a.category) }">{{ categoryEmoji(a.category) }}</span>
            <span class="flex-grow-1 min-w-0">
              <span class="d-block fw-bold text-truncate">{{ a.title }}</span>
              <span class="d-block small muted">{{ categoryLabel(a.category) }}<template v-if="a.area"> · {{ a.area }}</template></span>
            </span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <p class="small muted mb-3">This isn't a diagnosis. It's just a way to notice how you're trending.</p>
      <button class="gol-btn-primary" @click="close">Done</button>
    </div>
  </BottomSheet>
</template>

<script>
import BottomSheet from '../common/BottomSheet.vue'
import {
  WHO5_QUESTIONS,
  WHO5_OPTIONS,
  saveCheckIn,
  statusFor,
  latestCheckIn,
} from '../../stores/wellbeing.js'
import { awardWellbeingCheckIn, levelInfo } from '../../stores/gamification(badges).js'
import { allActivities, loadActivities } from '../../stores/activities.js'
import { useAuthStore } from '../../stores/auth.js'
import { wellbeingSuggestions } from '../../utils/profile.js'
import { categoryColor, categoryEmoji, categoryLabel } from '../../utils/activityStyle.js'

export default {
  name: 'CheckInSheet',
  components: { BottomSheet },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['close', 'saved'],
  data() {
    return {
      step: 'intro',
      busy: false,
      answers: [],
      result: null,
      reward: null, // points given for this check-in
      previous: null,
      questions: WHO5_QUESTIONS,
      options: WHO5_OPTIONS,
      promises: [
        { title: 'Private', text: 'Only you can see your answers and score' },
        { title: 'Every 2 weeks', text: "So you can see how you're trending" },
        { title: 'Not a diagnosis', text: 'Based on the WHO-5 Well-Being Index' },
      ],
    }
  },
  computed: {
    level() {
      return levelInfo()
    },
    suggestions() {
      if (!this.result) return []
      const interests = useAuthStore().preferences?.interests ?? []
      return wellbeingSuggestions(this.result.score, allActivities.value, interests)
    },
    status() {
      return this.result ? statusFor(this.result.score) : null
    },
    changeText() {
      if (!this.previous) return 'Your first check-in! Come back in 2 weeks to see your trend.'
      const diff = this.result.score - this.previous.score
      if (diff >= 10) return `Up ${diff} points since last time. Nice!`
      if (diff <= -10) return `Down ${Math.abs(diff)} points since last time. Be kind to yourself this week.`
      return 'About the same as last time.'
    },
  },
  watch: {
    // Reset every time the sheet opens
    open(isOpen) {
      if (isOpen) {
        this.step = 'intro'
        this.answers = []
        this.result = null
        this.reward = null
        loadActivities().catch(() => {}) // for the suggestions at the end
      }
    },
  },
  methods: {
    start() {
      this.previous = latestCheckIn()
      this.step = 0
    },
    choose(value) {
      if (this.busy) return // ignore double taps
      this.busy = true
      this.answers[this.step] = value
      // Small pause so the user sees their choice highlight
      setTimeout(() => {
        this.busy = false
        if (this.step < this.questions.length - 1) {
          this.step++
        } else {
          this.result = saveCheckIn(this.answers)
          this.reward = awardWellbeingCheckIn()
          this.step = 'result'
          this.$emit('saved', this.result)
        }
      }, 180)
    },
    categoryColor,
    categoryEmoji,
    categoryLabel,
    openActivity(a) {
      this.close()
      this.$router?.push(`/activities/${a.id}`)
    },
    close() {
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.eyebrow-teal { color: var(--gol-teal); }
.muted { color: var(--gol-muted); }

.hero-tile {
  width: 78px;
  height: 78px;
  border-radius: 20px;
  font-size: 2.2rem;
  background: var(--gol-cyan);
  box-shadow: 5px 5px 0 var(--gol-ink);
  transform: rotate(-6deg);
}

.promise {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 0.75rem 0.9rem;
}
.tick {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #d8f6f8;
  color: var(--gol-teal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bar-purple { background: var(--gol-purple) !important; }

.question {
  font-weight: 900;
  font-size: 1.35rem;
  line-height: 1.25;
}

.option {
  font-family: var(--gol-font);
  font-weight: 700;
  text-align: left;
  border: 2px solid transparent;
  background: #fff;
  border-radius: 16px;
  padding: 0.8rem 1rem;
  color: var(--gol-ink);
  box-shadow: 0 3px 0 var(--gol-card-edge);
  transition: border-color 0.15s, background 0.15s;
}
.option:hover { border-color: var(--gol-purple-soft); }
.option.selected {
  border-color: var(--gol-purple);
  background: var(--gol-purple-soft);
}

.back-link {
  color: var(--gol-purple);
  font-weight: 800;
  text-decoration: none;
}

.score-ring {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 8px solid var(--gol-cyan);
  background: #fff;
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 32px;
}
.score { font-size: 2.6rem; font-weight: 900; line-height: 1; }
.out-of { font-weight: 800; color: var(--gol-muted); }

.support-card {
  background: #fff;
  border-left: 5px solid var(--gol-coral);
  border-radius: 16px;
  padding: 0.9rem 1rem;
}
.support-card a { color: var(--gol-purple); }

.points-card {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 0.85rem 1rem;
  box-shadow: 0 3px 0 var(--gol-card-edge);
}
.points-badge {
  flex-shrink: 0;
  width: 58px;
  height: 58px;
  border-radius: 16px;
  border: 2px solid var(--gol-ink);
  box-shadow: 3px 3px 0 var(--gol-ink);
  background: var(--gol-lime);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.25rem;
  line-height: 1;
  transform: rotate(-4deg);
}
.points-badge small { font-size: 0.65rem; font-weight: 800; }
.points-badge.none { background: var(--gol-locked); }
.points-card .gol-progress > span { background: var(--gol-purple); }

.suggest-title { font-weight: 900; font-size: 1rem; }
.suggest-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  border: none;
  background: #fff;
  border-radius: 16px;
  padding: 0.65rem 0.85rem;
  text-align: left;
  color: var(--gol-ink);
  font-family: var(--gol-font);
  box-shadow: 0 3px 0 var(--gol-card-edge);
}
.suggest-row:hover { background: var(--gol-purple-soft); }
.suggest-emoji {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}
</style>
