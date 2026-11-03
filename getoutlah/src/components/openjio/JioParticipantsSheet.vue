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
  </BottomSheet>
</template>

<script>
import BottomSheet from '@/components/common/BottomSheet.vue'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'
import { getJioAttendees, friendlyJioError } from '@/services/openjio'

export default {
  name: 'JioParticipantsSheet',
  components: { BottomSheet, FriendAvatar },
  props: {
    open: { type: Boolean, default: false },
    jio: { type: Object, default: null },
  },
  emits: ['close'],
  data() {
    return { attendees: [], loading: false, error: '' }
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
        this.attendees = await getJioAttendees(this.jio.id, {
          legacyParticipants: this.jio.participants ?? [],
          hostId: this.jio.hostId,
        })
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
</style>
