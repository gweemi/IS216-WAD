<script setup>
import { ref, onMounted } from 'vue'
import { getRestrictedUsers, liftRestriction } from '@/services/api/reports'
import { accountRestriction } from '@/utils/reports'

const users = ref([]), loadError = ref('')
const busy = ref(false), message = ref('')
const confirming = ref(null)

async function load() {
  loadError.value = ''
  try { users.value = await getRestrictedUsers() }
  catch (e) { loadError.value = `Couldn't load users: ${e.message}` }
}
onMounted(load)
defineExpose({ load })

async function lift(u) {
  if (confirming.value !== u.uid) { confirming.value = u.uid; return }
  confirming.value = null
  busy.value = true; message.value = ''
  try {
    await liftRestriction(u.uid)
    message.value = `${u.displayName} can use OPENJIO again.`
    await load()
  } catch (e) {
    message.value = e.message ?? String(e)
  }
  busy.value = false
}

function statusText(u) {
  const r = accountRestriction(u)
  if (!r) return 'No longer restricted'
  if (r.type === 'banned') return 'Banned'
  return `Suspended until ${r.until.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
</script>

<template>
  <div class="gol-card mt-3">
    <h2 class="gol-section-title">Banned and suspended users</h2>
    <p class="adm-help">
      They can't start, join or report OPENJIOs. To stop a banned user signing in at all, also disable their account in
      Firebase console → Authentication → Users.
    </p>

    <p v-if="loadError" class="act-note act-note--warn">{{ loadError }}</p>
    <ul class="adm-orgs">
      <li v-for="u in users" :key="u.uid" class="adm-org" data-testid="restricted-user">
        <div class="adm-org-text">
          <span class="adm-org-name">{{ u.displayName || u.email }}</span>
          <span class="adm-org-id">{{ u.email }} · {{ statusText(u) }}</span>
        </div>
        <button class="adm-remove" :class="{ sure: confirming === u.uid }" :disabled="busy" @click="lift(u)">
          {{ confirming === u.uid ? 'Confirm lift' : 'Lift' }}
        </button>
      </li>
      <li v-if="!users.length && !loadError" class="adm-help">Nobody is banned or suspended.</li>
    </ul>
    <p v-if="message" class="det-msg">{{ message }}</p>
  </div>
</template>
