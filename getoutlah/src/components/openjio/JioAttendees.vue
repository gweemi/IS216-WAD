<!--
  "Who's going" list for an OPENJIO: its own sub-card on the activity details page, under Invite friends.
  Only the host and people going can see who's going; only the host also sees the chope queue.
  The parent decides whether to show it (see canSeeAttendees in ActivityDetailView):
    <JioAttendees :jio="jio" />
-->
<template>
  <section class="jio-attendees" data-testid="jio-attendees-section" aria-labelledby="jio-attendees-title">
    <h2 id="jio-attendees-title" class="jio-attendees__title">
      <i class="bi bi-people" aria-hidden="true"></i> Who's going
      <span class="jio-attendees__count">{{ jio.participantCount ?? jio.participants?.length ?? 0 }}/{{ jio.capacity ?? 0 }}</span>
    </h2>

    <p v-if="loading" class="muted mb-0">Loading attendees…</p>
    <p v-else-if="error" class="text-danger fw-bold mb-0" role="alert">{{ error }}</p>
    <template v-else>
      <ul class="attendee-list list-unstyled mb-0" data-testid="jio-attendees">
        <li v-for="person in attendees" :key="person.uid" class="attendee">
          <FriendAvatar :name="person.displayName" :photo="person.photoURL" :size="38" />
          <span class="flex-grow-1 fw-bold">{{ person.displayName }}</span>
          <span v-if="person.uid === jio.hostId" class="gol-pill tag-host">Host</span>
        </li>
      </ul>

      <!-- Host only: people who choped a spot, first in line at the top -->
      <div v-if="isHost && queue.length" class="mt-3" data-testid="jio-queue">
        <h3 class="queue-title">In the queue · {{ queue.length }}</h3>
        <p class="muted small mb-2">They get a spot in this order if someone leaves.</p>
        <ul class="attendee-list list-unstyled mb-0">
          <li v-for="person in queue" :key="person.uid" class="attendee">
            <FriendAvatar :name="person.displayName" :photo="person.photoURL" :size="38" />
            <span class="flex-grow-1 fw-bold">{{ person.displayName }}</span>
            <span class="gol-pill tag-queued">#{{ person.position }} in line</span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script>
import { mapStores } from 'pinia'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'
import { getJioAttendees, getJioQueue, friendlyJioError } from '@/services/openjio'
import { useOpenJioStore } from '@/stores/openjio'

export default {
  name: 'JioAttendees',
  components: { FriendAvatar },
  props: {
    jio: { type: Object, required: true },
  },
  data() {
    return { attendees: [], queue: [], loading: false, error: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore),
    isHost() {
      return this.jio.hostId === this.openJioStore.uid
    },
    // Reload only when who's in it changes, not on every jio update
    people() {
      return [...(this.jio.participants ?? []), '|', ...(this.jio.waitlist ?? [])].join(',')
    },
  },
  watch: {
    people() {
      this.load()
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const waitlist = this.jio.waitlist ?? []
        ;[this.attendees, this.queue] = await Promise.all([
          getJioAttendees(this.jio.id, { legacyParticipants: this.jio.participants ?? [], hostId: this.jio.hostId }),
          this.isHost && waitlist.length ? getJioQueue(this.jio.id, { waitlist, hostId: this.jio.hostId }) : [],
        ])
      } catch (err) {
        this.error = friendlyJioError(err)
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.jio-attendees { margin-top: 1rem; padding: .9rem; border: 2px solid var(--gol-card-edge); border-radius: 18px; background: #fbf9ff; }
.jio-attendees__title { display: flex; align-items: center; gap: .35rem; font-size: 0.95rem; font-weight: 900; margin: 0 0 0.6rem; }
.jio-attendees__title i { color: var(--gol-purple); }
.jio-attendees__count { margin-left: .2rem; padding: .1rem .5rem; border-radius: 999px; background: var(--gol-purple-soft); color: var(--gol-purple); font-size: .8rem; }
.muted { color: var(--gol-muted); font-weight: 700; }
.attendee-list { display: grid; gap: .5rem; }
.attendee { display: flex; align-items: center; gap: .65rem; min-width: 0; padding: .5rem .7rem; border: 2px solid var(--gol-card-edge); border-radius: 14px; background: #fff; }
.attendee > span.flex-grow-1 { min-width: 0; overflow-wrap: anywhere; }
.tag-host { background: var(--gol-purple-soft); color: var(--gol-purple); }
.tag-queued { background: #ffe1de; color: #b4382f; white-space: nowrap; }
.queue-title { font-size: .9rem; font-weight: 900; margin: 0 0 .2rem; }
</style>
