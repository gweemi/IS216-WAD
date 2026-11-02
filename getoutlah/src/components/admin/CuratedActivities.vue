<script setup>
// Admin: add, edit and remove admin-picked ("curated") activities. They're saved in Firestore
// "activities" next to the Eventbrite ones, so users see both together.
import { ref, reactive, computed, onMounted } from 'vue'
import { allActivities, loadActivities, reloadActivities, sourceErrors, seedFirestore } from '@/stores/activities'
import { saveCurated, removeCurated } from '@/services/api/curated'
import { searchPlaces } from '@/services/api/onemap'
import { emptyCurated, toCuratedActivity, CURATED_TYPES, ENERGY_LEVELS, CURATED_DESCRIPTION_MAX } from '@/utils/curated'
import { seedActivities } from '@/data/seedActivities'
import { INTERESTS } from '@/config/preferences'
import { categoryLabel, priceText } from '@/utils/activityStyle'

const busy = ref(false), message = ref('')
const editingId = ref(null), formOpen = ref(false), problems = ref([])
const form = reactive(emptyCurated())
const placeQuery = ref(''), places = ref([]), placeError = ref('')
const confirming = ref(null)

onMounted(loadActivities)
const curated = computed(() =>
  allActivities.value.filter((a) => a.source === 'curated').sort((a, b) => a.title.localeCompare(b.title)))

async function run(fn, done) {
  busy.value = true; message.value = ''
  try { await fn(); message.value = done } catch (e) { message.value = e.message ?? String(e) }
  busy.value = false
}

function openForm(activity) {
  Object.assign(form, emptyCurated(), activity ? { ...activity, url: activity.url ?? '', description: activity.description ?? '' } : {})
  editingId.value = activity?.id ?? null
  problems.value = []; places.value = []; placeQuery.value = ''; placeError.value = ''
  formOpen.value = true
}

async function findPlace() {
  placeError.value = ''
  if (!placeQuery.value.trim()) return
  try {
    places.value = await searchPlaces(placeQuery.value)
    if (!places.value.length) placeError.value = 'Nothing found. Try the postal code.'
  } catch (e) { placeError.value = e.message }
}
function pickPlace(p) {
  Object.assign(form, { lat: p.lat, lng: p.lng, area: form.area || p.name })
  placeQuery.value = p.address; places.value = []
}

function save() {
  problems.value = toCuratedActivity(form).problems
  if (problems.value.length) return
  const wasEditing = !!editingId.value
  run(async () => {
    await saveCurated(form, editingId.value)
    formOpen.value = false
    await reloadActivities()
  }, wasEditing ? `Saved "${form.title}".` : `Added "${form.title}". It now shows in Activities and on the map.`)
}

// First press asks for confirmation, second press removes.
function remove(a) {
  if (confirming.value !== a.id) { confirming.value = a.id; return }
  confirming.value = null
  run(async () => { await removeCurated(a.id); await reloadActivities() }, `Removed "${a.title}".`)
}

const seed = () => run(async () => { await seedFirestore(); await reloadActivities() },
  `Starter activities copied to Firestore.`)
</script>

<template>
  <div class="gol-card mt-3">
    <div class="adm-head">
      <h2 class="gol-section-title">Curated activities</h2>
      <button v-if="!formOpen" class="gol-btn-soft" :disabled="busy" @click="openForm()">+ Add activity</button>
    </div>
    <p class="adm-help">Activities you pick. They show alongside Eventbrite events in Activities and on the map.</p>

    <p v-if="sourceErrors.firestore" class="act-note act-note--warn">
      Couldn't read activities from Firestore ({{ sourceErrors.firestore }}). The list below is the built-in starter set, not what's saved.
    </p>

    <!-- Add / edit form -->
    <form v-if="formOpen" class="adm-form" @submit.prevent="save">
      <h3 class="adm-form-title">{{ editingId ? 'Edit activity' : 'New activity' }}</h3>

      <label class="adm-field adm-wide">Title
        <input id="cur-title" v-model="form.title" class="form-control" maxlength="80" required />
      </label>
      <label class="adm-field adm-wide">Description
        <textarea id="cur-description" v-model="form.description" class="form-control" rows="4"
          :maxlength="CURATED_DESCRIPTION_MAX" placeholder="What is it, and why would a student like it?" required></textarea>
        <span class="adm-help">{{ form.description.length }}/{{ CURATED_DESCRIPTION_MAX }}</span>
      </label>
      <label class="adm-field">Category
        <select id="cur-category" v-model="form.category" class="form-select">
          <option v-for="i in INTERESTS" :key="i.id" :value="i.id">{{ i.label }}</option>
        </select>
      </label>
      <label class="adm-field">Type
        <select id="cur-type" v-model="form.type" class="form-select">
          <option v-for="[id, label] in CURATED_TYPES" :key="id" :value="id">{{ label }}</option>
        </select>
      </label>
      <label class="adm-field">Price (S$)
        <input id="cur-cost" v-model="form.cost" class="form-control" type="number" min="0" step="0.5" placeholder="Empty = varies" />
      </label>
      <label class="adm-field">Duration (hours)
        <input id="cur-duration" v-model="form.durationHrs" class="form-control" type="number" min="0.5" max="12" step="0.5" />
      </label>
      <label class="adm-field">Indoor / outdoor
        <select id="cur-setting" v-model="form.setting" class="form-select">
          <option>Indoor</option><option>Outdoor</option>
        </select>
      </label>
      <label class="adm-field">Energy
        <select id="cur-energy" v-model="form.energyLevel" class="form-select">
          <option v-for="[id, label] in ENERGY_LEVELS" :key="id" :value="id">{{ label }}</option>
        </select>
      </label>
      <label class="adm-field adm-check">
        <input id="cur-group" v-model="form.groupFriendly" class="form-check-input" type="checkbox" /> Good for groups
      </label>
      <label class="adm-field adm-wide">Link (optional)
        <input id="cur-url" v-model="form.url" class="form-control" type="url" placeholder="https://…" />
      </label>

      <!-- Location: search OneMap, or type coordinates -->
      <div class="adm-field adm-wide">
        Location
        <div class="adm-place">
          <input id="cur-place" v-model="placeQuery" class="form-control" placeholder="Place, address or postal code"
            @keydown.enter.prevent="findPlace" />
          <button type="button" class="gol-btn-soft" @click="findPlace">Find</button>
        </div>
        <p v-if="placeError" class="adm-help">{{ placeError }}</p>
        <ul v-if="places.length" class="adm-places">
          <li v-for="p in places" :key="p.address">
            <button type="button" class="adm-place-pick" @click="pickPlace(p)">
              <strong>{{ p.name }}</strong><span>{{ p.address }}</span>
            </button>
          </li>
        </ul>
      </div>
      <label class="adm-field">Area name
        <input id="cur-area" v-model="form.area" class="form-control" placeholder="e.g. Bugis" />
      </label>
      <div class="adm-field adm-coords">
        <label>Latitude <input id="cur-lat" v-model="form.lat" class="form-control" type="number" step="any" /></label>
        <label>Longitude <input id="cur-lng" v-model="form.lng" class="form-control" type="number" step="any" /></label>
      </div>

      <ul v-if="problems.length" class="adm-problems adm-wide">
        <li v-for="p in problems" :key="p">{{ p }}</li>
      </ul>
      <div class="adm-form-actions adm-wide">
        <button class="gol-btn-primary" type="submit" :disabled="busy">{{ editingId ? 'Save changes' : 'Add activity' }}</button>
        <button class="gol-btn-soft" type="button" :disabled="busy" @click="formOpen = false">Cancel</button>
      </div>
    </form>

    <!-- List -->
    <ul class="adm-orgs">
      <li v-for="a in curated" :key="a.id" class="adm-org">
        <div class="adm-org-text">
          <span class="adm-org-name">{{ a.title }}</span>
          <span class="adm-org-id">{{ categoryLabel(a.category) }} · {{ a.area }} · {{ priceText(a) }}</span>
        </div>
        <div class="adm-row-actions">
          <button class="adm-edit" :disabled="busy" @click="openForm(a)">Edit</button>
          <button class="adm-remove" :class="{ sure: confirming === a.id }" :disabled="busy" @click="remove(a)">
            {{ confirming === a.id ? 'Confirm remove' : 'Remove' }}
          </button>
        </div>
      </li>
      <li v-if="!curated.length" class="adm-help">No curated activities yet. Add one, or load the starter set below.</li>
    </ul>

    <div class="adm-starter">
      <span class="adm-help">Load the {{ seedActivities.length }} built-in starter activities (replaces ones with the same id).</span>
      <button class="gol-btn-soft" :disabled="busy" @click="seed">Load starter set</button>
    </div>

    <p v-if="message" class="det-msg">{{ message }}</p>
  </div>
</template>
