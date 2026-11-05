<script setup>
import { ref, computed } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import SheetHeader from '@/components/common/SheetHeader.vue'
import PreferencesForm from '@/components/PreferencesForm.vue'
import { useAuthStore } from '@/stores/auth'
import { savePreferences } from '@/services/preferences'
import { INTERESTS, BUDGETS, ENERGY_LEVELS, GROUP_PREFERENCES } from '@/config/preferences'

const auth = useAuthStore()
const open = ref(false)
const formKey = ref(0)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const prefs = computed(() => auth.preferences)
const interests = computed(() =>
  (prefs.value?.interests ?? []).map((id) => INTERESTS.find((i) => i.id === id)).filter(Boolean),
)
const budget = computed(() => BUDGETS.find((b) => b.maxBudget === prefs.value?.maxBudget))
const energy = computed(() => ENERGY_LEVELS.find((e) => e.id === prefs.value?.energyLevel))
const group = computed(() => GROUP_PREFERENCES.find((g) => g.id === prefs.value?.groupPreference))

function openEdit() {
  error.value = ''
  formKey.value += 1
  open.value = true
}

async function onSubmit(answers) {
  saving.value = true
  error.value = ''
  try {
    await savePreferences(answers)
    open.value = false
    saved.value = true
    setTimeout(() => (saved.value = false), 2500)
  } catch (err) {
    error.value =
      err?.code === 'permission-denied' ? 'Couldn’t save. Please try again.' : err?.message || 'Something went wrong.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="gol-card prefs-card" data-testid="preferences-card">
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="gol-icon-tile tile-lime"><i class="ph ph-sliders-horizontal"></i></span>
      <div class="flex-grow-1 min-w-0">
        <div class="card-title">My vibe</div>
        <div class="card-sub">Your answers shape what we recommend</div>
      </div>
      <button class="gol-btn-soft edit-btn" data-testid="edit-preferences" @click="openEdit">
        <i class="ph ph-pencil-simple"></i> Edit
      </button>
    </div>

    <template v-if="prefs">
      <div class="d-flex flex-wrap gap-2 mb-3" aria-label="Interests">
        <span v-for="i in interests" :key="i.id" class="interest" :style="{ background: i.color }">
          {{ i.emoji }} {{ i.label }}
        </span>
      </div>
      <div class="facts">
        <div class="fact">
          <span class="fact-label">Budget</span>
          <span class="fact-value">{{ budget?.label ?? '—' }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Energy</span>
          <span class="fact-value">{{ energy?.label ?? "—" }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Usually go</span>
          <span class="fact-value">{{ group?.label ?? "—" }}</span>
        </div>
      </div>
    </template>
    <p v-else class="card-sub mb-0">You haven't answered the questionnaire yet.</p>

    <Transition name="fade">
      <p v-if="saved" class="saved-msg mb-0 mt-3" role="status">
        <i class="ph ph-check-circle"></i> Saved! Your recommendations are updated.
      </p>
    </Transition>

    <BottomSheet :open="open" label="Edit my preferences" @close="open = false">
      <SheetHeader class="mb-3" eyebrow="Change it up" title="My vibe" @close="open = false" />
      <div class="form-wrap">
        <PreferencesForm
          :key="formKey"
          :initial="prefs"
          :saving="saving"
          :error="error"
          submit-label="Save changes"
          @submit="onSubmit"
        />
      </div>
    </BottomSheet>
  </section>
</template>

<style scoped>
.prefs-card { font-family: var(--gol-font); color: var(--gol-ink); }
.min-w-0 { min-width: 0; }
.tile-lime { background: var(--gol-lime); }
.card-title { font-weight: 900; font-size: 1rem; }
.card-sub { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); line-height: 1.3; }
.edit-btn { white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.35rem; }
.interest {
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--gol-ink);
}
.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.fact {
  background: var(--gol-bg);
  border-radius: 14px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.fact-label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gol-muted); }
.fact-value { font-weight: 800; font-size: 0.85rem; }
.saved-msg { display: flex; align-items: center; gap: 0.35rem; font-weight: 800; font-size: 0.85rem; color: #3a8a1f; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.form-wrap :deep(.progress-fill) { background: var(--gol-purple); }
.form-wrap :deep(.btn-primary) {
  --bs-btn-bg: var(--gol-purple);
  --bs-btn-border-color: var(--gol-purple);
  --bs-btn-hover-bg: var(--gol-purple-dark);
  --bs-btn-hover-border-color: var(--gol-purple-dark);
  --bs-btn-active-bg: var(--gol-purple-dark);
  --bs-btn-disabled-bg: var(--gol-purple);
  --bs-btn-disabled-border-color: var(--gol-purple);
  border-radius: 999px;
  font-weight: 800;
}
.form-wrap :deep(.option-tile.selected) {
  border-color: var(--gol-purple);
  background: var(--gol-purple-soft);
  box-shadow: 0 0 0 1px var(--gol-purple);
}
.form-wrap :deep(.option-tile:hover) { border-color: var(--gol-purple); }
</style>
