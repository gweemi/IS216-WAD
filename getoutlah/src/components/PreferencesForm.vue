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
    <div class="d-flex justify-content-between align-items-center mb-2 small text-secondary">
      <span data-testid="prefs-step">Step {{ step + 1 }} of {{ steps.length }}</span>
    </div>
    <div class="progress-track mb-4" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${((step + 1) / steps.length) * 100}%` }"></div>
    </div>

    <h2 class="h3 font-display fw-bold mb-1" data-testid="prefs-title">{{ steps[step].title }}</h2>
    <p class="text-secondary mb-4">{{ steps[step].subtitle }}</p>

    <!-- Step 1: interests (pick many) -->
    <div v-if="step === 0" class="option-grid" role="group" aria-label="Interests">
      <button
        v-for="opt in INTERESTS"
        :key="opt.id"
        type="button"
        class="option-tile"
        :class="{ selected: answers.interests.includes(opt.id) }"
        :aria-pressed="answers.interests.includes(opt.id)"
        :data-testid="`interest-${opt.id}`"
        @click="toggleInterest(opt.id)"
      >
        <span class="option-emoji" aria-hidden="true">{{ opt.emoji }}</span>
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
      <h3 class="h6 fw-semibold mb-2">Energy level</h3>
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

      <h3 class="h6 fw-semibold mb-2">Usually go</h3>
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
      class="alert alert-danger py-2 small mt-4 mb-0"
      role="alert"
      data-testid="prefs-error"
    >
      {{ error }}
    </div>

    <!-- Navigation -->
    <div class="d-flex justify-content-between align-items-center mt-4">
      <button
        type="button"
        class="btn btn-link link-secondary px-0"
        :style="{ visibility: step === 0 ? 'hidden' : 'visible' }"
        data-testid="prefs-back"
        @click="back"
      >
        ← Back
      </button>
      <button
        type="button"
        class="btn btn-primary px-4 py-2"
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
  height: 6px;
  background: var(--go-line);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--go-green);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.option-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  text-align: left;
  background: #fff;
  border: 1.5px solid var(--go-line);
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
  color: var(--go-ink);
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.option-tile:hover {
  border-color: var(--go-green);
}
.option-tile.selected {
  border-color: var(--go-green);
  background: #eef6ea;
  box-shadow: inset 0 0 0 1px var(--go-green);
}
.option-emoji {
  font-size: 1.4rem;
  line-height: 1;
  margin-bottom: 0.3rem;
}
.option-label {
  font-weight: 600;
  font-size: 0.95rem;
}
.option-hint {
  font-size: 0.8rem;
  color: var(--go-muted);
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.option-row {
  text-align: left;
  background: #fff;
  border: 1.5px solid var(--go-line);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-weight: 600;
  color: var(--go-ink);
}
.option-row:hover {
  border-color: var(--go-green);
}
.option-row.selected {
  border-color: var(--go-green);
  background: #eef6ea;
  box-shadow: inset 0 0 0 1px var(--go-green);
}

.option-tile:focus-visible,
.option-row:focus-visible {
  outline: 3px solid rgba(31, 107, 71, 0.35);
  outline-offset: 2px;
}

@media (max-width: 575px) {
  .option-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .option-grid.three {
    grid-template-columns: 1fr;
  }
  .option-grid.three .option-tile {
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
</style>
