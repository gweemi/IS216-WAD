<!--
  TEST PAGE ONLY. Lets you try your features before teammates'
  Profile/Settings/Map pages exist. Delete before submission.
  Router:  { path: '/test-my-features', component: MyFeaturesTestView }
-->
<template>
  <main class="gol-page">
    <div class="container py-4 page-inner">
      <p class="gol-eyebrow">Test page</p>
      <h1 class="gol-title mb-4">Wellbeing + points playground</h1>

      <div class="row g-3">
        <div class="col-12 col-lg-6 d-grid gap-3 align-content-start">
          <div>
            <h2 class="gol-section-title mb-2">Profile: wellbeing card</h2>
            <WellbeingCard />
          </div>
          <div>
            <h2 class="gol-section-title mb-2">Profile: reflections card</h2>
            <ReflectionsCard />
          </div>
        </div>

        <div class="col-12 col-lg-6 d-grid gap-3 align-content-start">
          <div>
            <h2 class="gol-section-title mb-2">Settings rows</h2>
            <div class="gol-card"><WellbeingSettings /></div>
          </div>

          <div>
            <h2 class="gol-section-title mb-2">Fake a check-in</h2>
            <div class="gol-card">
              <select v-model="pick" class="form-select mb-2">
                <option v-for="a in activities" :key="a.id" :value="a">
                  {{ a.title }} ({{ a.category }}, {{ a.energy }})
                </option>
              </select>
              <div class="d-flex gap-2 flex-wrap">
                <button class="gol-btn-soft" @click="fakeCheckIn(true)">Check in (nearby)</button>
                <button class="gol-btn-soft" @click="fakeCheckIn(false)">Check in (too far)</button>
                <button class="gol-btn-soft" @click="reset">Reset data</button>
              </div>
              <p v-if="message" class="mt-2 mb-0 fw-bold">{{ message }}</p>
              <p class="small text-muted mt-2 mb-0">
                After a check-in, a "How was it?" banner pops up at the bottom (from
                &lt;ReflectionPrompt /&gt; in App.vue). Tap it to rate your mood and get suggestions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import WellbeingCard from '../components/wellbeing/WellbeingCard.vue'
import ReflectionsCard from '../components/wellbeing/ReflectionsCard.vue'
import WellbeingSettings from '../components/wellbeing/WellbeingSettings.vue'
import { checkInToActivity, resetGamification } from '../stores/gamification(badges).js'
import { resetReflections } from '../stores/reflections.js'
import { SAMPLE_ACTIVITIES } from '../data/sampleActivities.js'

export default {
  name: 'MyFeaturesTestView',
  components: { WellbeingCard, ReflectionsCard, WellbeingSettings },
  data() {
    return { activities: SAMPLE_ACTIVITIES, pick: SAMPLE_ACTIVITIES[0], message: '' }
  },
  methods: {
    async fakeCheckIn(nearby) {
      const a = { ...this.pick, id: this.pick.id + '-' + Date.now() } // new id so you can repeat
      // Pretend the user is standing 50m (nearby) or 1km (too far) away
      const offset = nearby ? 0.00045 : 0.009
      const res = await checkInToActivity(a, { lat: a.lat + offset, lng: a.lng })
      this.message = res.message
      if (res.newBadges && res.newBadges.length) {
        this.message += ' New badge: ' + res.newBadges.map((b) => b.name).join(', ') + '!'
      }
    },
    reset() {
      resetGamification(false)
      resetReflections()
      this.message = 'Points, badges, streak and reflections cleared.'
    },
  },
}
</script>

<style scoped>
.page-inner { max-width: 1100px; }
</style>
