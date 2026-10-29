<script setup>
import '@/assets/discovery.css'
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { activityById, weatherAt, toggleSaved, isSaved, loadActivities } from '@/stores/activities'
import { friendsWhoDid } from '@/stores/ports'
import { recordCheckIn } from '@/services/friends'
import InviteFriendsSheet from '@/components/friends/InviteFriendsSheet.vue'
import { checkInToActivity } from '@/stores/gamification(badges).js'
import { useGeolocation } from '@/composables/useGeolocation'
import { directionsUrl } from '@/services/maps'
import { categoryColor, categoryEmoji, categoryLabel, tileTextColor, priceText, sourceLabel } from '@/utils/activityStyle'
import JioActionButton from '@/components/openjio/JioActionButton.vue'
import StartJioButton from '@/components/openjio/StartJioButton.vue'
import { prefillFromActivity } from '@/utils/openjio'

const route = useRoute()
const { request } = useGeolocation()
const message = ref(''), friendsDid = ref([]), showInvite = ref(false)
const BADGE_ENERGY = { low: 'calm', medium: 'moderate', high: 'high' } 

onMounted(loadActivities)
const activity = computed(() => activityById(route.params.id))
const weather = computed(() => (activity.value ? weatherAt(activity.value) : null))
const directions = computed(() => (activity.value?.lat != null ? directionsUrl(activity.value.lat, activity.value.lng) : null))
const saved = computed(() => (activity.value ? isSaved(activity.value.id) : false))

watchEffect(async () => { if (activity.value) friendsDid.value = await friendsWhoDid(activity.value.id) })

async function run(fn, ok) { message.value = ''; try { await fn(); message.value = ok } catch (e) { message.value = e.message } }
const doCheckIn = () => run(async () => {
  const a = activity.value
  const r = await checkInToActivity({
    id: a.id, title: a.title, category: a.category, region: a.region, lat: a.lat, lng: a.lng,
    energy: BADGE_ENERGY[a.energyLevel] ?? null, isOpenJio: a.type === 'openjio', hostedByMe: !!a.hostedByMe,
  }, await request())
  if (!r.ok) throw new Error(r.message)
  recordCheckIn(a.id).catch(() => {}) // lets friends see "Friends who have done this"
}, 'Checked in!')
</script>

<template>
  <div class="gol-page">
    <div class="container py-4 det-wrap">
      <router-link to="/activities" class="det-back"><i class="bi bi-arrow-left"></i> Back to activities</router-link>

      <div v-if="activity" class="det-layout mt-3">
        <!-- Left: picture + title -->
        <div class="gol-card det-main">
          <div class="det-hero" :style="{ background: categoryColor(activity.category), color: tileTextColor(activity.category) }">
            <span class="det-emoji">{{ categoryEmoji(activity.category) }}</span>
          </div>
          <div class="gol-eyebrow mt-3">{{ categoryLabel(activity.category) }}</div>
          <h1 class="gol-title">{{ activity.title }}</h1>
          <span class="act-source det-source">{{ sourceLabel(activity.source) }}</span>
        </div>

        <!-- Right: facts + actions -->
        <div class="gol-card det-side">
          <div class="det-grid">
            <div class="det-cell"><i class="bi bi-geo-alt"></i> {{ activity.area || 'Singapore' }}</div>
            <div class="det-cell"><i class="bi bi-tag"></i> {{ priceText(activity) }}</div>
            <div class="det-cell"><i class="bi bi-clock"></i> {{ activity.durationHrs ?? '?' }} hr<template v-if="activity.setting"> · {{ activity.setting }}</template></div>
            <div v-if="activity.slotsLeft != null" class="det-cell"><i class="bi bi-person-plus"></i> {{ activity.slotsLeft }} slots left</div>
            <div v-if="activity.startsAt" class="det-cell det-wide"><i class="bi bi-calendar-event"></i> {{ new Date(activity.startsAt).toLocaleString() }}</div>
          </div>

          <p v-if="weather" class="det-weather">
            <i class="bi bi-cloud-sun"></i> Weather near here: {{ weather.forecast }}
            <span v-if="weather.rainy && activity.setting === 'Outdoor'"> · rain expected, maybe pick an indoor activity</span>
          </p>
          <p v-if="friendsDid.length" class="det-weather">
            <i class="bi bi-people"></i> Friends who have done this: {{ friendsDid.map((f) => f.name).join(', ') }}
          </p>

          <JioActionButton v-if="activity.type === 'openjio'" :jio-id="activity.jioId" class="mt-3" />

          <div class="det-actions">
            <button v-if="activity.lat != null" class="gol-btn-primary" @click="doCheckIn">Check in</button>
            <button class="gol-btn-soft" @click="toggleSaved(activity.id)">
              <i class="bi" :class="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i> {{ saved ? 'Saved' : 'Save' }}
            </button>
            <button class="gol-btn-soft" data-testid="invite-friends" @click="showInvite = true">
              <i class="bi bi-person-plus"></i> Invite friends
            </button>
            <a v-if="directions" :href="directions" target="_blank" rel="noopener" class="gol-btn-soft det-link">
              <i class="bi bi-signpost-split"></i> Get directions
            </a>
            <StartJioButton v-if="activity.type !== 'openjio'" label="OpenJio this" variant="soft"
              :prefill="prefillFromActivity(activity)" />
          </div>
          <p v-if="message" class="det-msg">{{ message }}</p>
        </div>
      </div>
      <p v-else class="mt-4 fw-bold">Activity not found (or still loading).</p>
      <InviteFriendsSheet
        :open="showInvite"
        :activity="activity"
        @close="showInvite = false"
        @sent="(n) => (message = `Invite sent to ${n} friend${n > 1 ? 's' : ''}!`)"
      />
    </div>
  </div>
</template>
