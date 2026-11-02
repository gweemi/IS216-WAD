<!--
  "Start an OPENJIO" form, inside the team's BottomSheet.
  Usage:
    <CreateJioSheet :open="showCreate" @close="showCreate = false" @created="onCreated" />
  Optional :prefill fills in the form, e.g. from an activity or a free time slot:
    :prefill="{ title: 'Pottery jam', location: 'Bras Basah', startAt: new Date(...) }"
  See OPENJIO.md for the fields.
-->
<template>
  <BottomSheet :open="open" :label="isEditing ? 'Edit an OPENJIO' : 'Start an OPENJIO'" @close="$emit('close')">
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <p class="gol-eyebrow">Gather the crew</p>
        <h2 class="gol-title">{{ isEditing ? 'Edit your OPENJIO' : 'Start an OPENJIO!' }}</h2>
      </div>
      <button type="button" class="gol-close" aria-label="Close" @click="$emit('close')">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <form novalidate data-testid="create-jio-form" @submit.prevent="onSubmit">
      <label class="field">
        <span>What are we doing?</span>
        <input
          v-model="form.title"
          class="form-control"
          :maxlength="LIMITS.titleMax"
          placeholder="e.g. Badminton doubles @ SMU"
          data-testid="jio-title"
        />
      </label>

      <label class="field">
        <span>Category</span>
        <select v-model="form.category" class="form-select" data-testid="jio-category">
          <option value="" disabled>Pick one</option>
          <option v-for="i in INTERESTS" :key="i.id" :value="i.id">{{ i.emoji }} {{ i.label }}</option>
        </select>
      </label>

      <div class="field-row" style="grid-template-columns: 7fr 5fr">
        <label class="field">
          <span>Where?</span>
          <input
            v-model="form.location"
            class="form-control"
            :maxlength="LIMITS.locationMax"
            placeholder="e.g. SMU Sports Hall"
            data-testid="jio-location"
          />
        </label>
        <label class="field">
          <span>Region</span>
          <select v-model="form.region" class="form-select text-capitalize" data-testid="jio-region">
            <option v-for="r in REGIONS" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
      </div>

      <div class="field-row">
        <label class="field">
          <span>Date</span>
          <input v-model="date" type="date" class="form-control" :min="today" data-testid="jio-date" />
        </label>
        <label class="field">
          <span>Time</span>
          <input v-model="time" type="time" class="form-control" data-testid="jio-time" />
        </label>
      </div>

      <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr">
        <label class="field">
          <span>Hours</span>
          <input v-model.number="hours" type="number" min="0.25" max="12" step="0.25" class="form-control" />
        </label>
        <label class="field">
          <span>Cost ($)</span>
          <input v-model.number="form.cost" type="number" min="0" :max="LIMITS.maxCost" step="0.5" class="form-control" data-testid="jio-cost" />
        </label>
        <label class="field">
          <span>Total spots</span>
          <input
            v-model.number="form.capacity"
            type="number"
            :min="minimumCapacity"
            :max="LIMITS.maxCapacity"
            class="form-control"
            data-testid="jio-capacity"
          />
        </label>
      </div>
      <p class="hint">Total spots includes you, the host<span v-if="isEditing">. You already have {{ participantCount }} going.</span></p>

      <fieldset class="field">
        <span>Who can join your jio?</span>
        <p class="hint">Choose who can discover and participate in your activity.</p>
        <div class="visibility-toggle" role="radiogroup">
          <button
            v-for="v in VISIBILITY"
            :key="v.id"
            type="button"
            role="radio"
            :aria-checked="form.visibility === v.id"
            :class="{ active: form.visibility === v.id }"
            :data-testid="'jio-visibility-' + v.id"
            @click="form.visibility = v.id"
          >
            <i class="ph" :class="v.id === 'public' ? 'ph-globe-hemisphere-west' : v.id === 'friends_only' ? 'ph-users-three' : 'ph-lock-key'" aria-hidden="true"></i>
            <strong>{{ v.label }}</strong>
            <small>{{ v.hint }}</small>
          </button>
        </div>
        <p class="hint mb-0">{{ VISIBILITY.find((v) => v.id === form.visibility)?.hint ?? 'Legacy invite-only Jios keep their existing invited people.' }}</p>
      </fieldset>

      <p v-if="form.visibility === 'friends_only'" class="hint">Your currently accepted friends can discover this Jio. No invitation list is shared.</p>
      <p v-if="form.visibility === 'friends'" class="hint">
        This is a legacy invite-only Jio. Its existing invited people are preserved; choose a new visibility mode to change access.
      </p>
      <fieldset v-if="form.visibility === 'invite_only'" class="field" data-testid="jio-invite-list">
        <span>Invite friends ({{ form.invited.length }})</span>
        <p v-if="friendsLoading" class="hint mt-0">Loading your friends…</p>
        <p v-else-if="!friends.length" class="hint mt-0">
          You haven't added any friends yet. Add some on the Friends page, or make this jio public.
        </p>
        <div v-else class="friend-list">
          <label v-for="f in friends" :key="f.uid" class="friend" :class="{ picked: form.invited.includes(f.uid) }">
            <input v-model="form.invited" type="checkbox" :value="f.uid" class="visually-hidden" />
            <img v-if="f.photoURL" :src="f.photoURL" alt="" referrerpolicy="no-referrer" />
            <span v-else class="initial">{{ f.name[0] }}</span>
            {{ f.name }}
            <i class="bi ms-auto" :class="form.invited.includes(f.uid) ? 'bi-check-circle-fill' : 'bi-circle'"></i>
          </label>
        </div>
      </fieldset>

      <label class="field">
        <span>Details (optional)</span>
        <textarea
          v-model="form.description"
          class="form-control"
          rows="2"
          :maxlength="LIMITS.descriptionMax"
          placeholder="Court booked, bring water!"
        ></textarea>
      </label>

      <p v-if="error" class="error" role="alert" data-testid="create-jio-error">{{ error }}</p>

      <button type="submit" class="gol-btn-primary mt-2" :disabled="saving" data-testid="create-jio-submit">
        {{ saving ? (isEditing ? 'Saving…' : 'Posting…') : (isEditing ? 'Review changes' : 'Review OPENJIO') }}
      </button>
    </form>
  </BottomSheet>

  <Teleport to="body">
    <div v-if="confirmationOpen" class="jio-confirm-backdrop" @click.self="confirmationOpen = false">
      <section class="jio-confirm" role="dialog" aria-modal="true" aria-labelledby="jio-confirm-title" data-testid="jio-confirmation">
        <p class="gol-eyebrow">One last look</p>
        <h2 id="jio-confirm-title">{{ isEditing ? 'Save these changes?' : 'Post this OPENJIO?' }}</h2>
        <dl>
          <div><dt>Activity</dt><dd>{{ pendingJio?.title }}</dd></div>
          <div><dt>Category</dt><dd>{{ categoryText }}</dd></div>
          <div><dt>Where</dt><dd>{{ pendingJio?.location }} · {{ pendingJio?.region }}</dd></div>
          <div><dt>When</dt><dd>{{ dateTimeText }}</dd></div>
          <div><dt>Details</dt><dd>{{ pendingJio?.durationMins / 60 }} hours · ${{ pendingJio?.cost }} · {{ pendingJio?.capacity }} spots</dd></div>
          <div><dt>Visibility</dt><dd>{{ visibilityText }}</dd></div>
          <div v-if="pendingJio?.description"><dt>Note</dt><dd>{{ pendingJio.description }}</dd></div>
        </dl>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="jio-confirm__actions">
          <button type="button" class="gol-btn-soft" :disabled="saving" @click="confirmationOpen = false">Go back</button>
          <button type="button" class="gol-btn-primary" :disabled="saving" data-testid="jio-confirm-submit" @click="confirmSubmit">
            {{ saving ? (isEditing ? 'Saving…' : 'Posting…') : (isEditing ? 'Save changes' : 'Post OPENJIO') }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import BottomSheet from '@/components/common/BottomSheet.vue'
import { INTERESTS } from '@/config/preferences'
import { VISIBILITY, REGIONS, LIMITS, validateJio } from '@/utils/openjio'
import { createJio, updateJio, friendlyJioError } from '@/services/openjio'
import { friendsState, friendList } from '@/stores/friends'

// 'YYYY-MM-DD' in the user's own time zone
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Tomorrow at 3pm
function defaultStart() {
  const d = new Date(Date.now() + 86400000)
  d.setHours(15, 0, 0, 0)
  return d
}

function blankForm() {
  return {
    title: '',
    category: '',
    location: '',
    region: 'central',
    cost: 0,
    capacity: 6,
    visibility: 'public',
    invited: [], // friends' uids, for invite-only jios
    description: '',
    lat: null,
    lng: null,
  }
}

export default {
  name: 'CreateJioSheet',
  components: { BottomSheet },
  props: {
    open: { type: Boolean, default: false },
    prefill: { type: Object, default: null },
    editJio: { type: Object, default: null },
  },
  emits: ['close', 'created', 'updated'],
  data() {
    return {
      INTERESTS,
      VISIBILITY,
      REGIONS,
      LIMITS,
      form: blankForm(),
      date: '',
      time: '',
      hours: 2,
      saving: false,
      error: '',
      confirmationOpen: false,
      pendingJio: null,
    }
  },
  watch: {
    // Start fresh (plus any prefill) every time the sheet opens
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.fillForm()
      },
    },
  },
  computed: {
    // Accepted friends from the Friends page: [{ uid, name, photoURL }]
    friends() {
      return friendList.value
    },
    friendsLoading() {
      return !friendsState.ready && !friendsState.error
    },
    today() {
      return isoDate(new Date())
    },
    // Everything in the shape validateJio() and createJio() expect
    jio() {
      return {
        ...this.form,
        startAt: this.date && this.time ? new Date(`${this.date}T${this.time}`) : null,
        durationMins: Math.round(this.hours * 60),
      }
    },
    isEditing() {
      return Boolean(this.editJio?.id)
    },
    participantCount() {
      return this.editJio?.participants?.length ?? 1
    },
    minimumCapacity() {
      return Math.max(LIMITS.minCapacity, this.participantCount)
    },
    categoryText() {
      const interest = INTERESTS.find((item) => item.id === this.pendingJio?.category)
      return interest ? `${interest.emoji} ${interest.label}` : ''
    },
    dateTimeText() {
      const start = this.pendingJio?.startAt
      return start instanceof Date ? start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''
    },
    visibilityText() {
      if (this.pendingJio?.visibility === 'public') return 'Public'
      if (this.pendingJio?.visibility === 'friends_only') return 'Friends only'
      if (this.pendingJio?.visibility === 'friends') return 'Legacy invite only'
      const count = this.pendingJio.invited?.length ?? 0
      return `Invite only · ${count} invited`
    },
  },
  methods: {
    fillForm() {
      const p = this.editJio ?? this.prefill ?? {}
      const form = blankForm()
      for (const key of Object.keys(form)) {
        if (p[key] !== undefined && p[key] !== null) {
          form[key] = Array.isArray(p[key]) ? [...p[key]] : p[key]
        }
      }
      // Only keep a category the form knows about
      if (!INTERESTS.some((i) => i.id === form.category)) form.category = ''
      this.form = form

      const start = p.startAt instanceof Date ? p.startAt : defaultStart()
      this.date = isoDate(start)
      this.time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      this.hours = p.durationMins ? p.durationMins / 60 : 2
      this.error = ''
      this.confirmationOpen = false
      this.pendingJio = null
    },

    onSubmit() {
      this.error = validateJio(this.jio)[0] ?? ''
      if (this.error) return

      if (this.isEditing && this.jio.capacity < this.participantCount) {
        this.error = `Total spots cannot be lower than the ${this.participantCount} people already going.`
        return
      }

      this.pendingJio = {
        ...this.jio,
        invited: [...this.jio.invited],
      }
      this.confirmationOpen = true
    },

    async confirmSubmit() {
      if (!this.pendingJio) return
      this.saving = true
      this.error = ''
      try {
        const id = this.isEditing
          ? await updateJio(this.editJio.id, this.pendingJio)
          : await createJio(this.pendingJio)
        this.confirmationOpen = false
        this.$emit(this.isEditing ? 'updated' : 'created', id)
      } catch (err) {
        this.error = friendlyJioError(err)
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.field { display: block; margin-bottom: 0.75rem; border: 0; padding: 0; }
.field > span {
  display: block;
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
}
.form-control,
.form-select {
  border-radius: 14px;
  border: 2px solid var(--gol-card-edge);
  font-weight: 600;
}
.form-control:focus,
.form-select:focus {
  border-color: var(--gol-purple);
  box-shadow: 0 0 0 0.2rem rgba(107, 66, 227, 0.2);
}
.hint { color: var(--gol-muted); font-size: 0.78rem; font-weight: 600; margin-top: -0.4rem; }
.visibility-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .5rem;
  margin-bottom: 0.6rem;
}
.visibility-toggle button {
  display: grid;
  min-height: 6.8rem;
  align-content: start;
  gap: .25rem;
  text-align: left;
  border: 2px solid var(--gol-card-edge);
  border-radius: 16px;
  padding: .7rem;
  background: #fff;
  color: var(--gol-muted);
}
.visibility-toggle button > i { font-size: 1.25rem; color: var(--gol-purple); }
.visibility-toggle button > strong { color: var(--gol-ink); font-size: .85rem; }
.visibility-toggle button > small { font-size: .72rem; line-height: 1.2; font-weight: 700; }
.visibility-toggle button.active { border-color: var(--gol-purple); background: var(--gol-purple-soft); box-shadow: 0 2px 0 var(--gol-purple); }
@media (max-width: 420px) { .visibility-toggle { grid-template-columns: 1fr; } .visibility-toggle button { min-height: auto; } }
.friend-list { display: grid; gap: 0.4rem; max-height: 220px; overflow-y: auto; }
.friend {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #fff;
  border: 2px solid var(--gol-card-edge);
  border-radius: 14px;
  padding: 0.45rem 0.7rem;
  font-weight: 800;
  cursor: pointer;
}
.friend.picked { border-color: var(--gol-purple); color: var(--gol-purple); }
.friend img,
.friend .initial {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}
.friend .initial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--gol-purple-soft);
  color: var(--gol-purple);
}
.error { color: #b4382f; font-weight: 800; margin-bottom: 0.5rem; }
.jio-confirm-backdrop { position: fixed; z-index: 1060; inset: 0; display: grid; padding: 1rem; place-items: center; background: rgba(34, 26, 59, .48); backdrop-filter: blur(4px); }
.jio-confirm { width: min(29rem, 100%); max-height: min(40rem, calc(100dvh - 2rem)); overflow-y: auto; padding: 1.35rem; border: 2px solid var(--gol-card-edge); border-radius: 24px; background: #fff8ef; box-shadow: 0 18px 46px rgba(35, 25, 65, .3); }
.jio-confirm h2 { margin: .2rem 0 1rem; font-size: 1.35rem; font-weight: 900; }
.jio-confirm dl { display: grid; gap: .55rem; margin: 0; }
.jio-confirm dl div { display: grid; grid-template-columns: 5.2rem 1fr; gap: .5rem; padding-bottom: .55rem; border-bottom: 1px solid rgba(35, 25, 65, .12); }
.jio-confirm dt { color: var(--gol-muted); font-size: .78rem; font-weight: 800; }
.jio-confirm dd { margin: 0; font-size: .87rem; font-weight: 800; overflow-wrap: anywhere; }
.jio-confirm__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; margin-top: 1.1rem; }
</style>
