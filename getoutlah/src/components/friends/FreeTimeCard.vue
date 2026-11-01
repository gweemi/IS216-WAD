<!--
  "When are you free?" — the student adds time slots.
  Friends see when you're free at the same time, and the Activities
  "fits my free time" filter uses these slots too.
-->
<script setup>
import { ref, computed } from 'vue'
import { friendsState } from '@/stores/friends'
import { saveFreeWindows } from '@/services/friends'
import { formatWindow } from '@/utils/friends'

const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const adding = ref(false)
const day = ref(todayStr())
const from = ref('18:00')
const to = ref('21:00')
const error = ref('')
const saving = ref(false)

const windows = computed(() => friendsState.myFreeWindows)

async function save(list) {
  saving.value = true
  error.value = ''
  try {
    await saveFreeWindows(list)
    return true
  } catch {
    error.value = 'Could not save. Please try again.'
    return false
  } finally {
    saving.value = false
  }
}

async function add() {
  const start = new Date(`${day.value}T${from.value}`).getTime()
  const end = new Date(`${day.value}T${to.value}`).getTime()
  if (!start || !end || end <= start) return (error.value = 'The end time must be after the start time.')
  if (end <= Date.now()) return (error.value = 'That time has already passed.')
  if (await save([...windows.value, { start, end }])) adding.value = false
}

function cancel() {
  adding.value = false
  error.value = ''
}

const remove = (w) => save(windows.value.filter((x) => x !== w))
</script>

<template>
  <section class="gol-card">
    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
      <h2 class="gol-section-title"><i class="bi bi-calendar-heart me-1"></i> When are you free?</h2>
      <button v-if="!adding" class="gol-btn-soft" data-testid="free-add" @click="adding = true">
        <i class="bi bi-plus-lg"></i> Add
      </button>
    </div>
    <p class="text-muted small fw-semibold mb-2">
      Friends see when you're free at the same time, so it's easy to plan something.
    </p>

    <!-- Day on its own row on phones; all three side by side from small screens up -->
    <form v-if="adding" class="row g-2 mb-2" @submit.prevent="add">
      <div class="col-12 col-sm-4">
        <label class="form-label small fw-bold mb-1" for="ft-day">Day</label>
        <input id="ft-day" v-model="day" type="date" class="form-control" :min="todayStr()" required />
      </div>
      <div class="col-6 col-sm-4">
        <label class="form-label small fw-bold mb-1" for="ft-from">From</label>
        <input id="ft-from" v-model="from" type="time" class="form-control" required />
      </div>
      <div class="col-6 col-sm-4">
        <label class="form-label small fw-bold mb-1" for="ft-to">To</label>
        <input id="ft-to" v-model="to" type="time" class="form-control" required />
      </div>
      <div class="col-12 d-flex gap-2">
        <button type="submit" class="gol-btn-coral" :disabled="saving">Save</button>
        <button type="button" class="gol-btn-soft" @click="cancel">Cancel</button>
      </div>
    </form>
    <p v-if="error" class="small fw-bold mb-2" style="color: var(--gol-coral-text)">{{ error }}</p>

    <ul v-if="windows.length" class="list-unstyled d-flex flex-column gap-2 mb-0">
      <li
        v-for="w in windows"
        :key="w.start + '-' + w.end"
        class="d-flex justify-content-between align-items-center gap-2 rounded-4 ps-3 pe-1 py-1 fw-bold small"
        style="background: var(--gol-good-zone)"
      >
        <span><i class="bi bi-clock me-1"></i>{{ formatWindow(w) }}</span>
        <button
          class="btn btn-sm btn-link text-muted"
          :aria-label="'Remove ' + formatWindow(w)"
          :disabled="saving"
          @click="remove(w)"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </li>
    </ul>
    <p v-else-if="!adding" class="text-muted small fw-semibold mb-0">No free time added yet.</p>
  </section>
</template>
