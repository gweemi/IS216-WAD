<script setup>
import '@/assets/discovery.css'
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { activityById, datesOf, weatherAt, toggleSaved, isSaved, loadActivities } from '@/stores/activities'
import { friendsWhoDid } from '@/stores/ports'
import { recordCheckIn } from '@/services/friends'
import InviteFriendsSheet from '@/components/friends/InviteFriendsSheet.vue'
import { checkInToActivity } from '@/stores/gamification(badges).js'
import { isPlanned, togglePlan, removePlan } from '@/stores/plans'
import { useGeolocation } from '@/composables/useGeolocation'
import { directionsUrl } from '@/services/maps'
import { categoryColor, categoryEmoji, categoryLabel, tileTextColor, priceText, sourceLabel, whenText, bookingLink, durationText } from '@/utils/activityStyle'
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
const dates = computed(() => (activity.value ? datesOf(activity.value) : []))
const booking = computed(() => bookingLink(activity.value))
const heroImage = computed(() => activity.value?.imageLargeUrl ?? activity.value?.imageUrl ?? null)
const brokenImage = ref(null)   // a picture that didn't load: show the emoji instead

// Long descriptions (over 100 words) show the first 100 words and a "Show more" button.
const SHORT_WORDS = 50
const showFullDescription = ref(false)
watch(() => route.params.id, () => { showFullDescription.value = false })   // collapse again on another activity or date
const descriptionIsLong = computed(() => (activity.value?.description ?? '').trim().split(/\s+/).length > SHORT_WORDS)
const shownDescription = computed(() => {
  const text = activity.value?.description ?? ''
  if (!descriptionIsLong.value || showFullDescription.value) return text
  const first100 = text.match(new RegExp(`^(\\s*\\S+){${SHORT_WORDS}}`))[0]   // first 100 words, line breaks kept
  return first100 + '…'
})
const saved = computed(() => (activity.value ? isSaved(activity.value.id) : false))
const planned = computed(() => (activity.value ? isPlanned(activity.value.id) : false))   // "My plans" on Profile

watchEffect(async () => { if (activity.value) friendsDid.value = await friendsWhoDid(activity.value.id) })

async function run(fn, ok) { message.value = ''; try { await fn(); message.value = ok } catch (e) { message.value = e.message } }
const doCheckIn = () => run(async () => {
  const a = activity.value
  const r = await checkInToActivity({
    id: a.id, title: a.title, category: a.category, region: a.region, lat: a.lat, lng: a.lng,
    energy: BADGE_ENERGY[a.energyLevel] ?? null, isOpenJio: a.type === 'openjio', hostedByMe: !!a.hostedByMe,
  }, await request())
  if (!r.ok) throw new Error(r.message)
  await removePlan(a.id).catch(() => {})   // moves the activity from My plans to Completed
  recordCheckIn(a.id).catch(() => {})      // lets friends see “Friends who have done this”
}, 'Checked in!')
const doJoin = () => run(() => togglePlan(activity.value.id), planned.value ? 'Removed from your plans.' : 'Added to My plans on your Profile.')
</script>

<template>
  <div class="gol-page">
    <div class="container py-4 det-wrap">
      <router-link to="/activities" class="det-back"><i class="bi bi-arrow-left"></i> Back to activities</router-link>

      <div v-if="activity" class="det-layout mt-3">
        <!-- Left: picture + title -->
        <div class="gol-card det-main">
          <div class="det-hero" :style="{ background: categoryColor(activity.category), color: tileTextColor(activity.category) }">
            <img v-if="heroImage && heroImage !== brokenImage" :src="heroImage" alt="" @error="brokenImage = heroImage" />
            <span v-else class="det-emoji">{{ categoryEmoji(activity.category) }}</span>
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

        <!-- Right: facts + actions -->
        <div class="gol-card det-side">
          <div class="det-grid">
            <div class="det-cell"><i class="bi bi-geo-alt"></i> {{ activity.area || 'Singapore' }}</div>
            <div class="det-cell"><i class="bi bi-tag"></i> {{ priceText(activity) }}</div>
            <div class="det-cell"><i class="bi bi-clock"></i> {{ durationText(activity) }}<template v-if="activity.setting"> · {{ activity.setting }}</template></div>
            <div v-if="activity.slotsLeft != null" class="det-cell"><i class="bi bi-person-plus"></i> {{ activity.slotsLeft }} slots left</div>
            <div v-if="activity.startsAt && dates.length <= 1" class="det-cell det-wide"><i class="bi bi-calendar-event"></i> {{ whenText(activity.startsAt) }}</div>
          </div>

          <!-- Repeating event: every upcoming date. Picking one switches the page to that date. -->
          <div v-if="dates.length > 1" class="det-dates">
            <h2 class="det-dates-title"><i class="bi bi-calendar-event"></i> {{ dates.length }} dates</h2>
            <ul>
              <li v-for="d in dates" :key="d.id">
                <router-link :to="`/activities/${d.id}`" class="det-date" :class="{ on: d.id === activity.id }"
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

          <JioActionButton v-if="activity.type === 'openjio'" :jio-id="activity.jioId" class="mt-3" />

          <div class="det-actions">
            <!-- Sign-up happens on Eventbrite (or the activity's own site), in a new tab. -->
            <a v-if="booking" :href="booking.href" target="_blank" rel="noopener" class="gol-btn-primary det-link det-book">
              <i class="bi bi-ticket-perforated"></i> {{ booking.label }} <i class="bi bi-box-arrow-up-right"></i>
            </a>
            <button v-if="activity.lat != null" class="gol-btn-primary" @click="doCheckIn">Check in</button>
            <button class="gol-btn-soft" :aria-pressed="planned" @click="doJoin">
              <i class="bi" :class="planned ? 'bi-calendar-check-fill' : 'bi-calendar-plus'"></i> {{ planned ? 'Joined' : 'Join' }}
            </button>
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
