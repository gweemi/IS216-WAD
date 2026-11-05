<script setup>
import '@/assets/discovery.css'
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { activityById, datesOf, weatherAt, toggleSaved, isSaved, loadActivities } from '@/stores/activities'
import { friendsWhoDid } from '@/stores/ports'
import { recordCheckIn } from '@/services/friends'
import InviteFriendsSheet from '@/components/friends/InviteFriendsSheet.vue'
import { checkInToActivity } from '@/stores/gamification(badges).js'
import { useGeolocation } from '@/composables/useGeolocation'
import { directionsUrl } from '@/services/maps'
import { categoryColor, categoryEmoji, categoryLabel, tileTextColor, priceText, sourceLabel, whenText, bookingLink, durationText } from '@/utils/activityStyle'
import JioActionButton from '@/components/openjio/JioActionButton.vue'
import StartJioButton from '@/components/openjio/StartJioButton.vue'
import { prefillFromActivity, myRole, statusOf } from '@/utils/openjio'
import ReportJioButton from '@/components/reports/ReportJioButton.vue'
import JioAttendees from '@/components/openjio/JioAttendees.vue'
import { useOpenJioStore } from '@/stores/openjio'

const route = useRoute()
const back = computed(() => (route.query.from === 'map' ? { to: '/map', label: 'Back to map' } : { to: '/activities', label: 'Back to activities' }))
const { request } = useGeolocation()
const message = ref(''), friendsDid = ref([]), showInvite = ref(false), earnedBadges = ref([])
const BADGE_ENERGY = { low: 'calm', medium: 'moderate', high: 'high' } 

onMounted(loadActivities)
const activity = computed(() => activityById(route.params.id))
const weather = computed(() => (activity.value ? weatherAt(activity.value) : null))
const directions = computed(() => (activity.value?.lat != null ? directionsUrl(activity.value.lat, activity.value.lng) : null))
const dates = computed(() => (activity.value ? datesOf(activity.value) : []))
const booking = computed(() => bookingLink(activity.value))
const heroImage = computed(() => activity.value?.imageLargeUrl ?? activity.value?.imageUrl ?? null)
const brokenImage = ref(null)
// Change code is necessary: the picture fades in once it has downloaded, instead of popping in
const loadedImage = ref(null)

const SHORT_WORDS = 50
const showFullDescription = ref(false)
watch(() => route.params.id, () => { showFullDescription.value = false })  
const descriptionIsLong = computed(() => (activity.value?.description ?? '').trim().split(/\s+/).length > SHORT_WORDS)
const shownDescription = computed(() => {
  const text = activity.value?.description || ''
  if (!descriptionIsLong.value || showFullDescription.value) return text
  const first100 = text.match(new RegExp(`^(\\s*\\S+){${SHORT_WORDS}}`))[0]  
  return first100 + '…'
})
const saved = computed(() => (activity.value ? isSaved(activity.value.id) : false))
const jios = useOpenJioStore()
const jio = computed(() => (activity.value?.type === 'openJio' ? jios.all.find((j) => j.id === activity.value.jioId) ?? null : null))
const jioSuspended = computed(() => jio.value?.status === 'suspended')
// Same rule as JioCard: only the host can edit, and only while the jio is open or full.
// Only the host and people going can see who's going (same rule as the server check in getJioAttendees)
const canSeeAttendees = computed(() => !!jio.value && ['host', 'going'].includes(myRole(jio.value, jios.uid)))
const canEditJio = computed(() => !!jio.value && myRole(jio.value, jios.uid) === 'host' && ['open', 'full'].includes(statusOf(jio.value)))

watchEffect(async () => { if (activity.value) friendsDid.value = await friendsWhoDid(activity.value.id) })

const doCheckIn = async () => {
  message.value = ''
  earnedBadges.value = []
  try {
    const a = activity.value
    const r = await checkInToActivity({
    id: a.id, title: a.title, category: a.category, region: a.region, lat: a.lat, lng: a.lng,
    energy: BADGE_ENERGY[a.energyLevel] ?? null, isOpenJio: a.type === 'openJio', hostedByMe: !!a.hostedByMe,
    }, await request())
    if (!r.ok) throw new Error(r.message)
    recordCheckIn(a.id).catch(() => {})
    message.value = r.message
    earnedBadges.value = r.newBadges ?? []
  } catch (error) { message.value = error.message }
}
</script>

<template>
  <div class="gol-page">
    <div class="container py-4 det-wrap">
      <router-link :to="back.to" class="det-back"><i class="bi bi-arrow-left"></i> {{ back.label }}</router-link>

      <div v-if="activity" class="det-layout mt-3">
        <div class="gol-card det-main">
          <div class="det-hero" :style="{ background: categoryColor(activity.category), color: tileTextColor(activity.category) }">
            <!-- Change code is necessary: added class + @load so the picture fades in -->
            <img v-if="heroImage && heroImage !== brokenImage" :src="heroImage" alt=""
              class="det-hero-img" :class="{ 'is-loaded': loadedImage === heroImage }"
              @load="loadedImage = heroImage" @error="brokenImage = heroImage" />
            <span v-else class="det-emoji">{{ categoryEmoji(activity.category) }}</span>
            <!-- Same round save button as the top-right of ActivityCard -->
            <button class="act-save" :class="{ on: saved }" :aria-label="saved ? 'Unsave' : 'Save'" :aria-pressed="saved"
              data-testid="save-activity" @click="toggleSaved(activity.id)">
              <i class="bi" :class="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
            </button>
          </div>
          <div class="gol-eyebrow mt-3">{{ categoryLabel(activity.category) }}</div>
          <h1 class="gol-title">{{ activity.title }}</h1>
          <span class="act-source det-source">{{ sourceLabel(activity.source) }}</span>
          <section v-if="activity.description" class="det-about">
            <h2 class="det-dates-title"><i class="bi bi-info-circle"></i> About</h2>
            <p class="det-description">{{ shownDescription }}</p>
            <button v-if="descriptionIsLong" class="det-more" :aria-expanded="showFullDescription"
              @click="showFullDescription = !showFullDescription">
              {{ showFullDescription ? 'Show less' : 'Show more' }}
              <i class="bi" :class="showFullDescription ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </button>
          </section>
        </div>

        <div class="gol-card det-side">
          <div class="det-grid">
            <div class="det-cell"><i class="bi bi-geo-alt"></i> {{ activity.area || 'Singapore' }}</div>
            <div class="det-cell"><i class="bi bi-tag"></i> {{ priceText(activity) }}</div>
            <div class="det-cell"><i class="bi bi-clock"></i> {{ durationText(activity) }}<template v-if="activity.setting"> · {{ activity.setting }}</template></div>
            <div v-if="activity.slotsLeft != null" class="det-cell"><i class="bi bi-person-plus"></i> {{ activity.slotsLeft }} slots left</div>
            <div v-if="activity.startsAt && dates.length <= 1" class="det-cell det-wide"><i class="bi bi-calendar-event"></i> {{ whenText(activity.startsAt) }}</div>
          </div>

          <div v-if="dates.length > 1" class="det-dates">
            <h2 class="det-dates-title"><i class="bi bi-calendar-event"></i> {{ dates.length }} dates</h2>
            <ul>
              <li v-for="d in dates" :key="d.id">
                <router-link :to="{ path: `/activities/${d.id}`, query: route.query }" class="det-date" :class="{ on: d.id === activity.id }"
                  :aria-current="d.id === activity.id ? 'true' : undefined">
                  {{ whenText(d.startsAt) }}
                  <span v-if="d.slotsLeft != null" class="det-date-slots">{{ d.slotsLeft === 0 ? 'Full' : `${d.slotsLeft} left` }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <p v-if="weather" class="det-weather">
            <i class="bi bi-cloud-sun"></i> Weather near here: {{ weather.forecast }}
            <span v-if="weather.rainy && activity.setting === 'Outdoor'"> · rain expected, maybe pick an indoor activity</span>
          </p>
          <p v-if="friendsDid.length" class="det-weather">
            <i class="bi bi-people"></i> Friends who have done this: {{ friendsDid.map((f) => f.name).join(', ') }}
          </p>

          <!-- Host: Cancel jio and Edit OPENJIO side by side -->
          <div v-if="activity.type === 'openJio'" class="det-jio-actions mt-3">
            <JioActionButton :jio-id="activity.jioId" />
            <router-link v-if="canEditJio" :to="{ name: 'openjio-edit', params: { id: activity.jioId } }"
              class="gol-btn-soft det-link det-jio-edit" data-testid="edit-jio">
              <i class="bi bi-pencil-square" aria-hidden="true"></i> Edit OPENJIO
            </router-link>
          </div>
          <ReportJioButton v-if="activity.type === 'openJio'" :jio-id="activity.jioId" class="mt-2" />

          <div class="det-actions">
            <a v-if="booking" :href="booking.href" target="_blank" rel="noopener" class="gol-btn-primary det-link det-book">
              <i class="bi bi-ticket-perforated"></i> {{ booking.label }} <i class="bi bi-box-arrow-up-right"></i>
            </a>
            <button v-if="activity.lat != null && !jioSuspended" class="gol-btn-primary" @click="doCheckIn">Check in</button>
            <button v-if="!jioSuspended" class="gol-btn-soft" data-testid="invite-friends" @click="showInvite = true">
              <i class="bi bi-person-plus"></i> Invite friends
            </button>
            <a v-if="directions" :href="directions" target="_blank" rel="noopener" class="gol-btn-soft det-link">
              <i class="bi bi-signpost-split"></i> Get directions
            </a>
            <StartJioButton v-if="activity.type !== 'openJio'" label="OpenJio this" variant="soft"
              :prefill="prefillFromActivity(activity)" />
          </div>
          <!-- OPENJIO: who's going, as its own sub-card under Invite friends (host and people going only) -->
          <JioAttendees v-if="canSeeAttendees" :jio="jio" />
          <p v-if="message" class="det-msg">{{ message }}</p>
          <p v-if="earnedBadges.length" class="det-msg"><i class="bi bi-trophy-fill"></i> New badge{{ earnedBadges.length > 1 ? 's' : '' }}: {{ earnedBadges.map((badge) => badge.name).join(', ') }} · <router-link :to="{ name: 'badges' }">View Badge</router-link></p>
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

<style scoped>
/* Change code is necessary: smoother arrival of the activity page */

/* The content fades in and rises a little, instead of appearing all at once */
.det-layout { animation: det-enter 0.3s ease-out both; }
@keyframes det-enter {
  from { opacity: 0; transform: translateY(12px); }   /* start: invisible, a little lower */
  to { opacity: 1; transform: none; }                 /* end: fully visible, in place */
}

/* The picture starts invisible and fades in once it has downloaded */
.det-hero-img { opacity: 0; transition: opacity 0.3s ease-out; }
.det-hero-img.is-loaded { opacity: 1; }

/* People who turn on "Reduce motion" on their phone get no animation */
@media (prefers-reduced-motion: reduce) {
  .det-layout { animation: none; }
  .det-hero-img { transition: none; }
}
</style>
