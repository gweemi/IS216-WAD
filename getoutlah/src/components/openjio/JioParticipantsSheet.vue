<template>
  <BottomSheet :open="open" label="OpenJio attendees" @close="$emit('close')">
    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
      <div>
        <p class="gol-eyebrow mb-1">Who's coming</p>
        <h2 class="gol-title mb-1">{{ jio?.title }}</h2>
        <p class="muted mb-0">{{ jio?.participantCount ?? jio?.participants?.length ?? 0 }} of {{ jio?.capacity ?? 0 }} spots filled</p>
      </div>
      <button class="gol-close" type="button" aria-label="Close attendees" @click="$emit('close')"><i class="bi bi-x-lg"></i></button>
    </div>

    <p v-if="loading" class="muted">Loading attendees…</p>
    <p v-else-if="error" class="text-danger fw-bold" role="alert">{{ error }}</p>
    <ul v-else class="attendee-list list-unstyled mb-0" data-testid="jio-attendees">
      <li v-for="person in attendees" :key="person.uid" class="attendee">
        <FriendAvatar :name="person.displayName" :photo="person.photoURL" :size="42" />
        <span class="flex-grow-1 fw-bold">{{ person.displayName }}</span>
        <span v-if="person.uid === jio?.hostId" class="gol-pill tag-host">Host</span>
      </li>
    </ul>

    <!-- Host only: people who choped a spot, first in line at the top -->
    <section v-if="isHost && !loading && !error && queue.length" class="mt-3" data-testid="jio-queue">
      <h3 class="queue-title">In the queue · {{ queue.length }}</h3>
      <p class="muted small mb-2">They get a spot in this order if someone leaves.</p>
      <ul class="attendee-list list-unstyled mb-0">
        <li v-for="person in queue" :key="person.uid" class="attendee">
          <FriendAvatar :name="person.displayName" :photo="person.photoURL" :size="42" />
          <span class="flex-grow-1 fw-bold">{{ person.displayName }}</span>
          <span class="gol-pill tag-queued">#{{ person.position }} in line</span>
        </li>
      </ul>
    </section>
  </BottomSheet>
</template>

<script>
import BottomSheet from '@/components/common/BottomSheet.vue'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'
import { mapStores } from 'pinia'
import { getJioAttendees, getJioQueue, friendlyJioError } from '@/services/openjio'
import { useOpenJioStore } from '@/stores/openjio'

export default {
  name: 'JioParticipantsSheet',
  components: { BottomSheet, FriendAvatar },
  props: {
    open: { type: Boolean, default: false },
    jio: { type: Object, default: null },
  },
  emits: ['close'],
  data() {
    return { attendees: [], queue: [], loading: false, error: '' }
  },
  computed: {
    ...mapStores(useOpenJioStore),
    isHost() {
      return !!this.jio && this.jio.hostId === this.openJioStore.uid
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.loadAttendees()
    },
    jio: {
      deep: true,
      handler() {
        if (this.open) this.loadAttendees()
      },
    },
  },
  methods: {
    async loadAttendees() {
      if (!this.jio) return
      this.loading = true
      this.error = ''
      try {
        const waitlist = this.jio.waitlist ?? []
        ;[this.attendees, this.queue] = await Promise.all([
          getJioAttendees(this.jio.id, {
            legacyParticipants: this.jio.participants ?? [],
            hostId: this.jio.hostId,
          }),
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
.muted { color: var(--gol-muted); font-weight: 700; }
.attendee-list { display: grid; gap: .55rem; }
.attendee { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; border: 2px solid var(--gol-card-edge); border-radius: 16px; background: #fff; }
.tag-host { background: var(--gol-purple-soft); color: var(--gol-purple); }
.tag-queued { background: #ffe1de; color: #b4382f; }
.queue-title { font-size: 1rem; font-weight: 900; margin: 0 0 .2rem; }
</style>
