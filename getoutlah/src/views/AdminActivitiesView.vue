<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { syncEventbriteToFirestore } from '@/services/api/eventbriteSync'
import { seedFirestore } from '@/stores/activities'
import '@/assets/discovery.css'

const isAdmin = computed(() => useAuthStore().profile?.role === 'admin')
const token = ref(''), organizers = ref('')
const busy = ref(false), message = ref('')

async function run(fn, label) {
  busy.value = true; message.value = ''
  try { message.value = label(await fn()) } catch (e) { message.value = e.message ?? String(e) }
  busy.value = false
}
const sync = () => run(() => syncEventbriteToFirestore({ token: token.value.trim(), organizerIds: organizers.value }),
  (r) => `Done: ${r.added} added, ${r.updated} updated, ${r.skipped} skipped.` + (r.failures.length ? ` Problems: ${r.failures.join('; ')}` : ''))
const seed = () => run(seedFirestore, () => 'Starter activities copied to Firestore.')
</script>

<template>
  <div class="gol-page">
    <div class="container py-4" style="max-width: 640px">
      <div class="gol-eyebrow">Admin</div>
      <h1 class="gol-title">Manage activities</h1>

      <p v-if="!isAdmin" class="mt-4 fw-bold">Admins only.</p>
      <template v-else>
        <div class="gol-card mt-3">
          <h2 class="gol-section-title">Sync from Eventbrite</h2>
          <p class="adm-help">This already runs every morning at 6am. Use it to sync right now.
            Copies the live public events of the organisers into Firestore. Safe to run again: it won't overwrite category or energy edits.
            Leave the organiser box empty to use <code>VITE_EVENTBRITE_ORGANIZER_IDS</code> from <code>.env.local</code>.</p>
          <input v-model="token" class="form-control mb-2" type="password" placeholder="Eventbrite private token" autocomplete="off" />
          <input v-model="organizers" class="form-control mb-3" placeholder="Organiser ids, separated by commas (optional)" autocomplete="off" />
          <button class="gol-btn-primary" :disabled="busy" @click="sync">{{ busy ? 'Working…' : 'Sync now' }}</button>
        </div>

        <div class="gol-card mt-3">
          <h2 class="gol-section-title">Starter activities</h2>
          <p class="adm-help">Copies the 12 built-in activities into Firestore (overwrites ones with the same id).</p>
          <button class="gol-btn-soft" :disabled="busy" @click="seed">Copy starter set</button>
        </div>

        <p v-if="message" class="det-msg">{{ message }}</p>
      </template>
    </div>
  </div>
</template>
