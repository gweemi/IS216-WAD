<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getNparksListings, saveNparksPresentation } from '@/services/api/nparksListings'
import { INTERESTS } from '@/config/preferences'
import { ENERGY_LEVELS } from '@/utils/getoutlahPicks'

const trails = ref([])
const loading = ref(false), message = ref(''), error = ref('')
const editingId = ref(null)
const form = reactive({})

async function load() {
  loading.value = true; error.value = ''
  try { trails.value = await getNparksListings() } catch (cause) { error.value = cause.message ?? String(cause) }
  loading.value = false
}
onMounted(load)

function edit(trail) {
  editingId.value = trail.id
  Object.assign(form, {
    title: trail.title ?? '', description: trail.description ?? '', category: trail.category ?? 'outdoors',
    energyLevel: trail.energyLevel ?? 'medium', groupFriendly: !!trail.groupFriendly,
    area: trail.area ?? '', lat: trail.lat ?? null, lng: trail.lng ?? null,
  })
  message.value = ''
}

async function save() {
  loading.value = true; message.value = ''; error.value = ''
  try {
    await saveNparksPresentation(editingId.value, form)
    editingId.value = null
    await load()
    message.value = 'Trail presentation saved.'
  } catch (cause) { error.value = cause.message ?? String(cause); loading.value = false }
}
</script>

<template>
  <section class="gol-card mt-3">
    <div class="adm-head"><h2 class="gol-section-title">NParks Trails</h2></div>
    <p class="adm-help">Developer-imported trails. Edit the student-facing details and directions only; route data remains managed by NParks.</p>
    <p v-if="error" class="act-note act-note--warn">{{ error }}</p>

    <form v-if="editingId" class="adm-form" @submit.prevent="save">
      <h3 class="adm-form-title">Edit trail presentation</h3>
      <label class="adm-field adm-wide">Title <input v-model="form.title" class="form-control" maxlength="120" required /></label>
      <label class="adm-field adm-wide">Description <textarea v-model="form.description" class="form-control" rows="4" maxlength="5000" /></label>
      <label class="adm-field">Category <select v-model="form.category" class="form-select"><option v-for="item in INTERESTS" :key="item.id" :value="item.id">{{ item.label }}</option></select></label>
      <label class="adm-field">Energy <select v-model="form.energyLevel" class="form-select"><option v-for="[id, label] in ENERGY_LEVELS" :key="id" :value="id">{{ label }}</option></select></label>
      <label class="adm-field adm-check"><input v-model="form.groupFriendly" class="form-check-input" type="checkbox" /> Good for groups</label>
      <label class="adm-field">Area <input v-model="form.area" class="form-control" /></label>
      <div class="adm-field adm-coords"><label>Latitude <input v-model="form.lat" class="form-control" type="number" step="any" /></label><label>Longitude <input v-model="form.lng" class="form-control" type="number" step="any" /></label></div>
      <div class="adm-form-actions adm-wide"><button class="gol-btn-primary" :disabled="loading">Save changes</button><button class="gol-btn-soft" type="button" :disabled="loading" @click="editingId = null">Cancel</button></div>
    </form>

    <ul class="adm-orgs">
      <li v-for="trail in trails" :key="trail.id" class="adm-org">
        <div class="adm-org-text"><span class="adm-org-name">{{ trail.title }}</span><span class="adm-org-id">NParks route · {{ trail.nparks?.sourceTrailName }} · {{ trail.nparks?.featureObjectIds?.join(', ') }}</span></div>
        <button class="adm-edit" :disabled="loading" @click="edit(trail)">Edit</button>
      </li>
      <li v-if="!loading && !trails.length" class="adm-help">No NParks trails have been imported.</li>
    </ul>
    <p v-if="message" class="det-msg">{{ message }}</p>
  </section>
</template>
