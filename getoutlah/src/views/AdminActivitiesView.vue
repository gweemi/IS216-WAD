<script setup>
import { ref, onMounted } from 'vue'
import { syncEventbriteToFirestore, getLastDailySync } from '@/services/api/eventbriteSync'
import { getOrganisers, addOrganiser, removeOrganiser } from '@/services/api/organisers'
import { reloadActivities } from '@/stores/activities'
import CuratedActivities from '@/components/admin/CuratedActivities.vue'
import '@/assets/discovery.css'

const token = ref('')
const busy = ref(false), message = ref('')
const organisers = ref([]), newId = ref(''), newName = ref(''), loadError = ref('')
const confirming = ref(null)   // id of the organiser whose Remove button was pressed once

async function run(fn, label) {
  busy.value = true; message.value = ''
  try { message.value = label(await fn()) } catch (e) { message.value = e.message ?? String(e) }
  busy.value = false
}

async function loadOrganisers() {
  loadError.value = ''
  try { organisers.value = await getOrganisers() }
  catch (e) {
    loadError.value = e.code === 'permission-denied'
      ? 'Firestore blocked reading the organiser list. Publish the latest firestore.rules in the Firebase console, then reload.'
      : `Couldn't load the organiser list: ${e.message}`
  }
}
onMounted(loadOrganisers)   // the router only lets admins in

// Sync has its own message, shown right under its button (red when it failed).
const syncMessage = ref(''), syncFailed = ref(false)
const lastDailySync = ref(null)
onMounted(async () => { lastDailySync.value = await getLastDailySync() })
const syncTime = (ms) => new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' })

async function sync() {
  busy.value = true; syncMessage.value = ''; syncFailed.value = false
  try {
    const r = await syncEventbriteToFirestore({ token: token.value.trim() })
    await reloadActivities()   // so the rest of the app shows the synced events without a page refresh
    syncMessage.value = `Done: ${r.added} added, ${r.updated} updated, ${r.skipped} skipped, ${r.removed} removed.` + (r.failures.length ? ` Problems: ${r.failures.join('; ')}` : '')
  } catch (e) {
    syncFailed.value = true
    syncMessage.value = e.message ?? String(e)
  }
  busy.value = false
}

const add = () => run(async () => {
  organisers.value = await addOrganiser(newId.value, newName.value)
  newId.value = ''; newName.value = ''
}, () => 'Organiser added. Their events come in on the next sync.')

// First press asks for confirmation, second press removes.
function remove(o) {
  if (confirming.value !== o.id) { confirming.value = o.id; return }
  confirming.value = null
  run(async () => {
    const r = await removeOrganiser(o.id)
    organisers.value = r.organisers
    await reloadActivities()
    return r.deleted
  }, (deleted) => `Removed ${o.name}. ${deleted} of their events deleted.`)
}
</script>

<template>
  <div>
    <div class="gol-card mt-3">
      <h2 class="gol-section-title">Eventbrite organisers</h2>
      <p class="adm-help">Eventbrite no longer supports direct api for public events. To add events via eventbrite, add the organiser's public id, then sync with your private token.</p>

      <p v-if="loadError" class="act-note act-note--warn">{{ loadError }}</p>
      <ul v-else class="adm-orgs">
        <li v-for="o in organisers" :key="o.id" class="adm-org">
          <div class="adm-org-text">
            <span class="adm-org-name">{{ o.name }}</span>
            <a :href="`https://www.eventbrite.sg/o/${o.id}`" target="_blank" rel="noopener" class="adm-org-id">{{ o.id }}</a>
          </div>
          <button class="adm-remove" :class="{ sure: confirming === o.id }" :disabled="busy" @click="remove(o)">
            {{ confirming === o.id ? 'Confirm remove' : 'Remove' }}
          </button>
        </li>
        <li v-if="!organisers.length" class="adm-help">No organisers yet. Add one below.</li>
      </ul>

      <form class="adm-add" @submit.prevent="add">
        <input id="adm-new-id" v-model="newId" class="form-control" placeholder="Organiser id, e.g. 34519717313" inputmode="numeric" autocomplete="off" required />
        <input id="adm-new-name" v-model="newName" class="form-control" placeholder="Name, e.g. Singapore Clay Festival" autocomplete="off" />
        <button class="gol-btn-soft" type="submit" :disabled="busy">Add</button>
      </form>
    </div>

    <div class="gol-card mt-3">
      <h2 class="gol-section-title">Sync from Eventbrite</h2>
      <p class="adm-help">This already runs every morning at 6am. Use it to sync right now.
        Safe to run again: it won't overwrite category or energy edits.</p>
      <p class="adm-help" data-testid="last-daily-sync">Last daily sync: {{ lastDailySync ? syncTime(lastDailySync) : 'none recorded yet' }}</p>
      <input id="adm-token" v-model="token" class="form-control mb-3" type="password" placeholder="Eventbrite private token" autocomplete="off" />
      <button class="gol-btn-primary" :disabled="busy" @click="sync">{{ busy ? 'Working…' : 'Sync now' }}</button>
      <p v-if="syncMessage" class="adm-sync-msg" :class="{ failed: syncFailed }" role="status">{{ syncMessage }}</p>
    </div>

    <CuratedActivities />

    <p v-if="message" class="det-msg">{{ message }}</p>
  </div>
</template>
