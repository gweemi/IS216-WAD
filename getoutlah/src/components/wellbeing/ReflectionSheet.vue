<!--
  Post-activity reflection pop-up (Wellbeing 6c) + mood-based suggestions.
  Step 1: rate mood 1–4 and write an optional private note.
  Step 2: 3 suggested next activities based on that mood.

  Reflect on a pending activity:
    <ReflectionSheet :open="show" :item="pendingItem" @close="show = false" />
  Only show suggestions (from a past reflection):
    <ReflectionSheet :open="show" :suggest-from="latestEntry" @close="show = false" />
-->
<template>
  <BottomSheet :open="open" label="Post-activity reflection" @close="close">
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div class="min-w-0">
        <p class="gol-eyebrow">{{ step === 'rate' ? 'Only you can see this' : 'Up next for you' }}</p>
        <h2 class="gol-title sheet-title">{{ step === 'rate' ? 'How did it feel?' : plan.headline }}</h2>
      </div>
      <button class="gol-close" aria-label="Close" @click="close"><i class="bi bi-x-lg"></i></button>
    </div>

    <!-- STEP 1: mood + note -->
    <div v-if="step === 'rate' && item">
      <div class="activity-chip mb-3"><i class="bi bi-geo-alt-fill"></i> {{ item.activityTitle }}</div>

      <div class="mood-grid mb-3" role="radiogroup" aria-label="How did it feel?">
        <button
          v-for="m in moods"
          :key="m.value"
          type="button"
          class="mood-btn"
          :class="['mood--' + m.color, { selected: mood === m.value }]"
          role="radio"
          :aria-checked="mood === m.value"
          @click="mood = mood === m.value ? null : m.value"
        >
          <span class="mood-face"><i class="bi" :class="m.icon"></i></span>
          <span class="mood-label">{{ m.label }}</span>
        </button>
      </div>

      <label for="reflectionNote" class="note-label">Anything you want to remember? <span>(optional)</span></label>
      <textarea
        id="reflectionNote"
        v-model="note"
        class="note-box mb-1"
        rows="3"
        maxlength="500"
        placeholder="e.g. Felt calmer after the walk. Want to bring Jamie next time."
      ></textarea>
      <div class="d-flex justify-content-between small-muted mb-3">
        <span><i class="bi bi-lock-fill"></i> Private. No points, just for you.</span>
        <span>{{ note.length }}/500</span>
      </div>

      <button class="gol-btn-primary mb-2" :disabled="!mood && !note.trim()" @click="save">Save reflection</button>
      <button class="skip-btn" @click="skip">Skip this one</button>
    </div>

    <!-- STEP 2: suggestions (cards slide in with <TransitionGroup>) -->
    <div v-else-if="step === 'suggest'">
      <p class="small-muted plan-message mb-3">{{ plan.message }}</p>

      <TransitionGroup tag="div" name="suggest" appear class="d-grid gap-2 mb-3">
        <button v-for="(a, i) in plan.items" :key="a.id" type="button" class="suggest-card" :style="{ '--i': i }" @click="pick(a)">
          <span class="gol-icon-tile tile" :class="'tile--' + a.energy"><i class="bi" :class="iconFor(a.category)"></i></span>
          <span class="text-start flex-grow-1 min-w-0">
            <span class="d-block s-title">{{ a.title }}</span>
            <span class="d-block small-muted">{{ a.reason }}</span>
            <span class="d-flex flex-wrap gap-1 mt-1">
              <span class="chip">{{ energyLabels[a.energy] }}</span>
              <span class="chip">{{ a.cost ? 'S$' + a.cost : 'Free' }}</span>
              <span v-if="a.duration" class="chip">{{ a.duration }} min</span>
              <span v-if="a.isOpenJio" class="chip chip--jio">OPENJIO!</span>
            </span>
          </span>
          <i class="bi bi-chevron-right small-muted"></i>
        </button>
      </TransitionGroup>

      <p v-if="plan.tip" class="tip mb-3"><i class="bi bi-lightbulb"></i> {{ plan.tip }}</p>
      <button class="gol-btn-primary" @click="close">Done</button>
    </div>
  </BottomSheet>
</template>

<script>
import BottomSheet from '../common/BottomSheet.vue'
import { MOODS, reflections, saveReflection, skipReflection } from '../../stores/reflections.js'
import { game } from '../../stores/gamification(badges).js'
import { suggestNext } from '../../utils/moodSuggestions.js'
import { SAMPLE_ACTIVITIES } from '../../data/sampleActivities.js'

const ICONS = {
  nature: 'bi-tree',
  sports: 'bi-dribbble',
  workshop: 'bi-palette',
  arts: 'bi-brush',
  outdoor: 'bi-sun',
  volunteering: 'bi-heart',
  events: 'bi-calendar-event',
}

export default {
  name: 'ReflectionSheet',
  components: { BottomSheet },
  props: {
    open: { type: Boolean, default: false },
    item: { type: Object, default: null }, // pending reflection → start at step 1
    suggestFrom: { type: Object, default: null }, // saved reflection → jump to suggestions
    activities: { type: Array, default: () => SAMPLE_ACTIVITIES }, // pass the team's real list later
  },
  emits: ['close', 'saved', 'pick'],
  data() {
    return {
      moods: MOODS,
      energyLabels: { calm: 'Calm', moderate: 'Moderate', high: 'High energy' },
      step: 'rate',
      mood: null,
      note: '',
      plan: { headline: '', message: '', tip: null, items: [] },
    }
  },
  watch: {
    open(isOpen) {
      if (!isOpen) return
      this.mood = null
      this.note = ''
      if (this.suggestFrom) {
        this.buildPlan(this.suggestFrom.mood || 3, { ...this.suggestFrom, checkedInAt: this.suggestFrom.date })
        this.step = 'suggest'
      } else {
        this.step = 'rate'
      }
    },
  },
  methods: {
    buildPlan(mood, lastActivity) {
      this.plan = suggestNext({
        mood,
        lastActivity,
        activities: this.activities,
        doneIds: game.completed.map((a) => a.id),
        moodHistory: reflections.entries,
      })
    },
    save() {
      const lastActivity = { ...this.item }
      const entry = saveReflection(this.item, this.mood, this.note)
      this.$emit('saved', entry)
      this.buildPlan(this.mood || 3, lastActivity) // note only → treat as "Good"
      this.step = 'suggest'
    },
    skip() {
      skipReflection(this.item)
      this.close()
    },
    pick(activity) {
      this.$emit('pick', activity)
      this.close()
    },
    close() {
      this.$emit('close')
    },
    iconFor(category) {
      return ICONS[category] || 'bi-compass'
    },
  },
}
</script>

<style scoped>
.min-w-0 { min-width: 0; }
.sheet-title { font-size: clamp(1.4rem, 5vw, 1.9rem); }
.small-muted { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); }
.plan-message { font-size: 0.9rem; }

.activity-chip {
  display: inline-flex; align-items: center; gap: 0.35rem;
  background: var(--gol-purple-soft); color: var(--gol-purple);
  font-weight: 800; font-size: 0.85rem; border-radius: 999px; padding: 0.3rem 0.85rem;
}

/* Mood buttons */
.mood-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
.mood-btn {
  font-family: var(--gol-font); color: var(--gol-ink); background: #fff;
  border: 2px solid transparent; border-radius: 18px; padding: 0.7rem 0.25rem 0.6rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  box-shadow: 0 3px 0 var(--gol-card-edge); transition: transform 0.15s, border-color 0.15s;
}
.mood-btn:hover { transform: translateY(-2px); }
.mood-face {
  width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--gol-ink);
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #f6f3fa;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mood-label { font-weight: 800; font-size: 0.78rem; }
.mood--coral.selected .mood-face { background: var(--gol-coral); }
.mood--yellow.selected .mood-face { background: var(--gol-yellow); }
.mood--cyan.selected .mood-face { background: var(--gol-cyan); }
.mood--lime.selected .mood-face { background: var(--gol-lime); }
.mood-btn.selected { border-color: var(--gol-purple); }
.mood-btn.selected .mood-face { transform: scale(1.12) rotate(-6deg); box-shadow: 3px 3px 0 var(--gol-ink); }

/* Note */
.note-label { font-weight: 800; font-size: 0.9rem; margin-bottom: 0.35rem; display: block; }
.note-label span { color: var(--gol-muted); font-weight: 600; }
.note-box {
  width: 100%; font-family: var(--gol-font); font-weight: 600; color: var(--gol-ink); background: #fff;
  border: 2px solid var(--gol-card-edge); border-radius: 16px; padding: 0.7rem 0.9rem; resize: vertical;
}
.note-box:focus { outline: none; border-color: var(--gol-purple); }
.skip-btn {
  display: block; width: 100%; background: none; border: none;
  font-family: var(--gol-font); font-weight: 800; color: var(--gol-muted); padding: 0.4rem;
}

/* Suggestion cards */
.suggest-card {
  font-family: var(--gol-font); color: var(--gol-ink); display: flex; align-items: center; gap: 0.8rem;
  width: 100%; background: #fff; border: 2px solid transparent; border-radius: 18px; padding: 0.75rem 0.85rem;
  box-shadow: 0 3px 0 var(--gol-card-edge); transition: border-color 0.15s, transform 0.15s;
}
.suggest-card:hover { border-color: var(--gol-purple-soft); transform: translateY(-1px); }
.tile { width: 42px; height: 42px; font-size: 1.15rem; }
.tile--calm { background: var(--gol-cyan); }
.tile--moderate { background: var(--gol-lime); }
.tile--high { background: var(--gol-coral); }
.s-title { font-weight: 900; font-size: 0.95rem; line-height: 1.2; }
.chip {
  font-size: 0.65rem; font-weight: 800; background: var(--gol-purple-soft); color: var(--gol-purple);
  border-radius: 999px; padding: 0.1rem 0.5rem;
}
.chip--jio { background: var(--gol-yellow); color: var(--gol-ink); }
.tip {
  background: #fff; border-left: 5px solid var(--gol-yellow); border-radius: 14px;
  padding: 0.7rem 0.9rem; font-size: 0.85rem; font-weight: 700;
}

/* <TransitionGroup>: cards slide in one after another */
.suggest-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--i) * 90ms);
}
.suggest-enter-from { opacity: 0; transform: translateX(24px); }
</style>
