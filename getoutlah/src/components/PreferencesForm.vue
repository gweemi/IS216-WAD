<script setup>
// The new-user questionnaire, step by step.
// Reusable: the onboarding page uses it, and a profile page can reuse it
// to let people edit their answers (pass their current preferences as `initial`).
import { computed, reactive, ref } from 'vue'
import {
  INTERESTS,
  BUDGETS,
  ENERGY_LEVELS,
  GROUP_PREFERENCES,
  MIN_INTERESTS,
} from '@/config/preferences'

const props = defineProps({
  initial: { type: Object, default: null }, // existing preferences, when editing
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  submitLabel: { type: String, default: 'Finish' },
})
const emit = defineEmits(['submit'])

const answers = reactive({
  interests: [...(props.initial?.interests ?? [])],
  maxBudget: props.initial ? props.initial.maxBudget : undefined, // null is a real answer
  energyLevel: props.initial?.energyLevel ?? '',
  groupPreference: props.initial?.groupPreference ?? '',
})

const steps = [
  {
    title: 'What are you into?',
    subtitle: 'Pick as many as you like. We use these to suggest activities.',
  },
  { title: "What's your usual budget?", subtitle: 'Per activity. You can change this later.' },
  { title: "What's your vibe?", subtitle: 'How you usually like to spend your free time.' },
]
const step = ref(0)
const isLastStep = computed(() => step.value === steps.length - 1)

const stepComplete = computed(() => {
  if (step.value === 0) return answers.interests.length >= MIN_INTERESTS
  if (step.value === 1) return answers.maxBudget !== undefined
  return Boolean(answers.energyLevel && answers.groupPreference)
})

function toggleInterest(id) {
  const i = answers.interests.indexOf(id)
  if (i === -1) answers.interests.push(id)
  else answers.interests.splice(i, 1)
}

function next() {
  if (!stepComplete.value) return
  if (isLastStep.value) {
    emit('submit', { ...answers, interests: [...answers.interests] })
  } else {
    step.value += 1
  }
}

function back() {
  if (step.value > 0) step.value -= 1
}
</script>

<template>
  <div class="prefs-form">
    <!-- Progress -->
    <div class="prefs-progress-label">
      <span data-testid="prefs-step">Step {{ step + 1 }} of {{ steps.length }}</span>
      <span>{{ Math.round(((step + 1) / steps.length) * 100) }}% complete</span>
    </div>
    <div class="progress-track mb-4" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${((step + 1) / steps.length) * 100}%` }"></div>
    </div>

    <h2 class="prefs-title" data-testid="prefs-title">{{ steps[step].title }}</h2>
    <p class="prefs-subtitle">{{ steps[step].subtitle }}</p>

    <!-- Step 1: interests (pick many) -->
    <div v-if="step === 0" class="option-grid" role="group" aria-label="Interests">
      <button
        v-for="opt in INTERESTS"
        :key="opt.id"
        type="button"
        class="option-tile"
        :class="{ selected: answers.interests.includes(opt.id), 'option-tile--interest': step === 0 }"
        :style="step === 0 ? { '--option-accent': opt.color } : undefined"
        :aria-pressed="answers.interests.includes(opt.id)"
        :data-testid="`interest-${opt.id}`"
        @click="toggleInterest(opt.id)"
      >
        <span class="option-emoji option-emoji--interest" aria-hidden="true">{{ opt.emoji }}</span>
        <span class="option-label">{{ opt.label }}</span>
        <span class="option-hint">{{ opt.hint }}</span>
      </button>
    </div>

    <!-- Step 2: budget (pick one) -->
    <div v-else-if="step === 1" class="option-list" role="radiogroup" aria-label="Budget">
      <button
        v-for="opt in BUDGETS"
        :key="opt.id"
        type="button"
        role="radio"
        class="option-row"
        :class="{ selected: answers.maxBudget === opt.maxBudget }"
        :aria-checked="answers.maxBudget === opt.maxBudget"
        :data-testid="`budget-${opt.id}`"
        @click="answers.maxBudget = opt.maxBudget"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Step 3: energy level + solo/group (pick one each) -->
    <div v-else>
      <h3 class="prefs-group-title">Energy level</h3>
      <div class="option-grid three mb-4" role="radiogroup" aria-label="Energy level">
        <button
          v-for="opt in ENERGY_LEVELS"
          :key="opt.id"
          type="button"
          role="radio"
          class="option-tile"
          :class="{ selected: answers.energyLevel === opt.id }"
          :aria-checked="answers.energyLevel === opt.id"
          :data-testid="`energy-${opt.id}`"
          @click="answers.energyLevel = opt.id"
        >
          <span class="option-emoji" aria-hidden="true">{{ opt.emoji }}</span>
          <span class="option-label">{{ opt.label }}</span>
          <span class="option-hint">{{ opt.hint }}</span>
        </button>
      </div>

      <h3 class="prefs-group-title">Usually go</h3>
      <div class="option-grid three" role="radiogroup" aria-label="Solo or with friends">
        <button
          v-for="opt in GROUP_PREFERENCES"
          :key="opt.id"
          type="button"
          role="radio"
          class="option-tile"
          :class="{ selected: answers.groupPreference === opt.id }"
          :aria-checked="answers.groupPreference === opt.id"
          :data-testid="`group-${opt.id}`"
          @click="answers.groupPreference = opt.id"
        >
          <span class="option-emoji" aria-hidden="true">{{ opt.emoji }}</span>
          <span class="option-label">{{ opt.label }}</span>
          <span class="option-hint">{{ opt.hint }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="error"
        class="prefs-error"
      role="alert"
      data-testid="prefs-error"
    >
      {{ error }}
    </div>

    <!-- Navigation -->
    <div class="prefs-actions">
      <button
        type="button"
        class="prefs-back"
        :style="{ visibility: step === 0 ? 'hidden' : 'visible' }"
        data-testid="prefs-back"
        @click="back"
      >
        ← Back
      </button>
      <button
        type="button"
        class="prefs-next gol-btn-primary"
        :disabled="!stepComplete || saving"
        data-testid="prefs-next"
        @click="next"
      >
        <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ isLastStep ? submitLabel : 'Next' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.progress-track {
  height: 8px;
  background: var(--gol-purple-soft);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gol-purple), var(--gol-coral));
  border-radius: 999px;
  transition: width 0.3s ease;
}
.prefs-progress-label { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: .55rem; color: var(--gol-muted); font-size: .78rem; font-weight: 800; }
.prefs-title { margin: 1.55rem 0 .3rem; color: var(--gol-ink); font: 900 clamp(1.55rem, 4vw, 2rem)/1.1 var(--gol-font); }
.prefs-subtitle { margin: 0 0 1.5rem; color: var(--gol-muted); font-size: .95rem; font-weight: 700; }
.prefs-group-title { margin: 0 0 .65rem; color: var(--gol-ink); font: 900 1rem/1.2 var(--gol-font); }

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
}
.option-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  min-height: 132px;
  gap: .18rem;
  text-align: left;
  background: #fff;
  border: 2px solid var(--gol-card-edge);
  border-radius: 18px;
  padding: .9rem;
  color: var(--gol-ink);
  box-shadow: 0 3px 0 var(--gol-card-edge);
  transition:
    border-color .15s,
    background-color .15s,
    box-shadow .15s,
    transform .15s;
}
.option-tile:hover {
  border-color: var(--gol-purple);
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--gol-card-edge);
}
.option-tile.selected {
  border-color: var(--gol-purple);
  background: var(--gol-purple-soft);
  box-shadow: inset 0 0 0 1px var(--gol-purple), 0 3px 0 var(--gol-purple-dark);
}
.option-emoji {
  font-size: 1.55rem;
  line-height: 1;
  margin-bottom: 0.3rem;
}
.option-emoji--interest {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: .55rem;
  place-items: center;
  font-size: 1.8rem;
  background: var(--option-accent);
  border: 2px solid var(--gol-ink);
  border-radius: 50%;
  box-shadow: 0 2px 0 var(--gol-ink);
}
.option-label {
  font-weight: 900;
  font-size: 0.95rem;
}
.option-hint {
  font-size: 0.8rem;
  color: var(--gol-muted);
  font-weight: 700;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: .7rem;
}
.option-row {
  text-align: left;
  background: #fff;
  border: 2px solid var(--gol-card-edge);
  border-radius: 16px;
  padding: .9rem 1rem;
  font-weight: 900;
  color: var(--gol-ink);
  box-shadow: 0 3px 0 var(--gol-card-edge);
  transition: border-color .15s, background-color .15s, box-shadow .15s, transform .15s;
}
.option-row:hover {
  border-color: var(--gol-purple);
  transform: translateY(-1px);
}
.option-row.selected {
  border-color: var(--gol-purple);
  background: var(--gol-purple-soft);
  box-shadow: inset 0 0 0 1px var(--gol-purple), 0 3px 0 var(--gol-purple-dark);
}

.option-tile:focus-visible,
.option-row:focus-visible {
  outline: 3px solid rgba(107, 66, 227, .38);
  outline-offset: 2px;
}
.prefs-error { margin: 1.5rem 0 0; padding: .75rem .9rem; color: var(--gol-coral-text); background: #fff0ed; border: 2px solid var(--gol-coral); border-radius: 16px; font-size: .86rem; font-weight: 800; }
.prefs-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.75rem; }
.prefs-back { border: 0; border-radius: 999px; padding: .65rem .9rem; color: var(--gol-purple); background: var(--gol-purple-soft); font: 900 .9rem var(--gol-font); }
.prefs-back:hover { color: var(--gol-purple-dark); filter: brightness(.98); }
.prefs-back:focus-visible { outline: 3px solid rgba(107, 66, 227, .38); outline-offset: 2px; }
.prefs-next { width: auto; min-width: 9.5rem; padding: .75rem 1.3rem; }

@media (max-width: 575px) {
  .option-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .option-grid.three {
    grid-template-columns: 1fr;
  }
  .option-grid.three .option-tile {
    min-height: auto;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
  }
  .option-grid.three .option-emoji {
    margin-bottom: 0;
  }
  .option-grid.three .option-hint {
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill, .option-tile, .option-row { transition: none; }
  .option-tile:hover, .option-row:hover { transform: none; }
}
</style>
