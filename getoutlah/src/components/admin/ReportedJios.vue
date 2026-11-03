<script setup>
// Admin: reported OPENJIOs. Each jio shows once, with every report about it.
// A reported jio stays suspended until an admin picks one of the actions below.
import { ref, computed, onMounted } from 'vue'
import { getOpenReports, resolveReportedJio } from '@/services/api/reports'
import { groupReportsByJio, reasonLabel, SUSPENSION_DAYS } from '@/utils/reports'

const emit = defineEmits(['changed'])

const reports = ref([]), loading = ref(true), loadError = ref('')
const busy = ref(false), message = ref('')
const confirming = ref('')   // "jioId:action" of the button pressed once

const groups = computed(() => groupReportsByJio(reports.value))

// The buttons for each reported jio. Every one except Restore asks for a second press.
const ACTIONS = [
  { id: 'restore', label: 'Restore', style: 'gol-btn-soft', done: 'Restored. The OPENJIO is open again.' },
  { id: 'remove', label: 'Remove post', style: 'adm-danger', confirm: true, done: 'Post removed.' },
  {
    id: 'suspendHost', label: `Remove + suspend host ${SUSPENSION_DAYS} days`, style: 'adm-danger', confirm: true,
    done: `Post removed and host suspended for ${SUSPENSION_DAYS} days.`,
  },
  { id: 'banHost', label: 'Remove + ban host', style: 'adm-danger', confirm: true, done: 'Post removed and host banned.' },
]

async function load() {
  loading.value = true; loadError.value = ''
  try { reports.value = await getOpenReports() }
  catch (e) {
    loadError.value = e.code === 'permission-denied'
      ? 'Firestore blocked reading reports. Publish the latest firestore.rules, then reload.'
      : `Couldn't load reports: ${e.message}`
  }
  loading.value = false
}
onMounted(load)

async function act(group, action) {
  const key = `${group.jioId}:${action.id}`
  if (action.confirm && confirming.value !== key) { confirming.value = key; return }
  confirming.value = ''
  busy.value = true; message.value = ''
  try {
    await resolveReportedJio(group, action.id)
    message.value = `"${group.jioTitle}": ${action.done}`
    await load()
    emit('changed')
  } catch (e) {
    message.value = e.message ?? String(e)
  }
  busy.value = false
}

// When a report was made, e.g. "3 Nov 2026, 14:05".
// Right after sending, Firestore hasn't filled in the time yet, so say "just now".
function when(timestamp) {
  if (!timestamp) {
    return 'just now'
  }
  return timestamp.toDate().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' })
}
</script>

<template>
  <div class="gol-card mt-3">
    <div class="adm-head">
      <h2 class="gol-section-title">Reported OpenJios</h2>
      <button class="gol-btn-soft" :disabled="loading || busy" @click="load">Refresh</button>
    </div>
    <p class="adm-help">
      A reported OPENJIO is suspended straight away: people can see it, but nobody can join, leave, edit or cancel it.
      Restore it if the report was wrong. Suspending or banning the host also removes the post.
    </p>

    <p v-if="loadError" class="act-note act-note--warn">{{ loadError }}</p>
    <p v-else-if="loading" class="adm-help">Loading reports…</p>
    <p v-else-if="!groups.length" class="adm-help">No reports waiting. 🎉</p>

    <ul class="adm-orgs">
      <li v-for="g in groups" :key="g.jioId" class="adm-report" data-testid="reported-jio">
        <div class="adm-org-text">
          <span class="adm-org-name">{{ g.jioTitle }}</span>
          <span class="adm-org-id">Hosted by {{ g.hostName }} · {{ g.reports.length }} report{{ g.reports.length === 1 ? '' : 's' }}</span>
        </div>

        <ul class="adm-report-list">
          <li v-for="r in g.reports" :key="r.id">
            <strong>{{ reasonLabel(r.reason) }}</strong>
            <span class="adm-org-id"> · {{ r.reporterName }} · {{ when(r.createdAt) }}</span>
            <p v-if="r.details" class="adm-report-details">“{{ r.details }}”</p>
          </li>
        </ul>

        <div class="adm-report-actions">
          <button
            v-for="a in ACTIONS"
            :key="a.id"
            :class="[a.style, { sure: confirming === `${g.jioId}:${a.id}` }]"
            :disabled="busy"
            @click="act(g, a)"
          >
            {{ confirming === `${g.jioId}:${a.id}` ? `Confirm: ${a.label}` : a.label }}
          </button>
        </div>
      </li>
    </ul>

    <p v-if="message" class="det-msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.adm-report { padding: 0.8rem; border-radius: 12px; background: #fff; border: 1px solid var(--gol-card-edge); display: grid; gap: 0.5rem; }
.adm-report-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; font-size: 0.85rem; }
.adm-report-details { margin: 0.15rem 0 0; color: #685b76; font-weight: 600; font-size: 0.85rem; overflow-wrap: anywhere; }
.adm-report-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.adm-report-actions button { font-size: 0.8rem; padding: 0.4rem 0.8rem; }
.adm-danger { border: none; border-radius: 999px; font-weight: 800; background: #ffe1de; color: #b4382f; }
.adm-danger.sure { background: #dc4d4d; color: #fff; }
</style>
