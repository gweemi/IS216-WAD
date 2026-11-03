<!--
  "Free with friends" card for the Friends page: each time you're free at the same
  time as friends, with an OpenJio button that opens the create form with that time
  filled in, set to friends-only, and those friends ticked.
    <FreeTogetherJios />
  Times come from the Friends feature (friendList in stores/friends).
-->
<template>
  <section class="gol-card" data-testid="free-together-jios">
    <h2 class="gol-section-title mb-1"><i class="bi bi-calendar-check me-1"></i> Free with friends</h2>
    <p class="text-muted small fw-semibold mb-2">
      Times you and your friends are all free. Start an OpenJio! and they get the invite.
    </p>

    <div v-if="message" class="jio-toast small mb-2" role="status">
      {{ message }}
      <RouterLink :to="{ name: 'activities', query: { view: 'openJio' } }" class="fw-bolder text-white">See it in OPENJIO!</RouterLink>
    </div>

    <p v-if="!times.length" class="text-muted small fw-semibold mb-0">
      No shared free time yet. Add when you're free above, and times that match your friends show up here.
    </p>

    <ul v-else class="list-unstyled d-flex flex-column gap-2 mb-0">
      <li
        v-for="t in shown"
        :key="t.start + '-' + t.end"
        class="d-flex flex-wrap align-items-center gap-2 rounded-4 px-3 py-2"
        style="background: var(--gol-good-zone)"
        data-testid="free-together-slot"
      >
        <div class="flex-grow-1" style="min-width: 0">
          <div class="fw-bolder small"><i class="bi bi-clock me-1"></i>{{ formatWindow(t) }}</div>
          <div class="d-flex align-items-center gap-1 mt-1">
            <FriendAvatar v-for="f in t.friends.slice(0, 4)" :key="f.uid" :name="f.name" :photo="f.photoURL" :size="24" />
            <span class="small fw-semibold text-muted text-truncate">with {{ names(t.friends) }}</span>
          </div>
        </div>
        <StartJioButton
          label="OpenJio"
          variant="soft"
          :prefill="prefillFromWindow(t, t.friends.map((f) => f.uid))"
          @created="onCreated"
        />
      </li>
    </ul>
  </section>
</template>

<script>
import { friendList } from '@/stores/friends'
import { formatWindow } from '@/utils/friends'
import { commonFreeTimes, prefillFromWindow } from '@/utils/openjio'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'
import StartJioButton from '@/components/openjio/StartJioButton.vue'

export default {
  name: 'FreeTogetherJios',
  components: { FriendAvatar, StartJioButton },
  props: {
    max: { type: Number, default: 5 }, // how many times to list
  },
  data() {
    return { message: '' }
  },
  computed: {
    times() {
      return commonFreeTimes(friendList.value)
    },
    shown() {
      return this.times.slice(0, this.max)
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    formatWindow,
    prefillFromWindow,
    names(friends) {
      const first = friends.slice(0, 2).map((f) => f.name.split(' ')[0])
      return friends.length > 2 ? `${first.join(', ')} +${friends.length - 2}` : first.join(' and ')
    },
    onCreated() {
      this.message = 'Jio posted and your friends are invited.'
      clearTimeout(this.timer)
      this.timer = setTimeout(() => (this.message = ''), 6000)
    },
  },
}
</script>

<style scoped>
.jio-toast {
  background: var(--gol-ink);
  color: #fff;
  font-weight: 800;
  border-radius: 14px;
  padding: 0.55rem 0.9rem;
}
</style>
