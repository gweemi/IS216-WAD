<!--
  "Invite friends" pop-up on an activity's page.
  Usage: <InviteFriendsSheet :open="showInvite" :activity="activity" @close="showInvite = false" />
-->
<script setup>
import { ref, watch } from 'vue'
import { friendList } from '@/stores/friends'
import { inviteFriends } from '@/services/friends'
import { formatWindow } from '@/utils/friends'
import BottomSheet from '@/components/common/BottomSheet.vue'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  activity: { type: Object, default: null },
})
const emit = defineEmits(['close', 'sent'])

const picked = ref([])
const sending = ref(false)
const error = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    picked.value = []
    error.value = ''
  }
})

async function send() {
  sending.value = true
  error.value = ''
  try {
    await inviteFriends(props.activity, picked.value)
    emit('sent', picked.value.length)
    emit('close')
  } catch {
    error.value = 'Could not send the invites. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" label="Invite friends" @close="emit('close')">
    <div class="d-flex justify-content-between align-items-start mb-2">
      <div>
        <p class="gol-eyebrow">Bring the crew</p>
        <h2 class="gol-title fs-3">Invite friends</h2>
      </div>
      <button class="gol-close" aria-label="Close" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
    </div>

    <p v-if="!friendList.length" class="text-muted fw-semibold">
      You haven't added any friends yet.
      <RouterLink :to="{ name: 'friends' }" class="fw-bolder" style="color: var(--gol-purple)" @click="emit('close')">
        Add some on the Friends page.
      </RouterLink>
    </p>

    <!-- Each friend is a Bootstrap checkbox styled as a tappable row -->
    <div v-else class="d-flex flex-column gap-2 overflow-auto" style="max-height: 50vh">
      <label
        v-for="f in friendList"
        :key="f.uid"
        class="d-flex align-items-center gap-3 border rounded-4 px-3 py-2 bg-white"
        :style="picked.includes(f.uid) ? { borderColor: 'var(--gol-purple)', background: 'var(--gol-purple-soft) !important' } : null"
        role="button"
      >
        <FriendAvatar :name="f.name" :photo="f.photoURL" :size="40" />
        <span class="flex-grow-1 d-flex flex-column" style="min-width: 0">
          <span class="fw-bolder text-truncate">{{ f.name }}</span>
          <span v-if="f.freeTogether.length" class="small fw-bold" style="color: var(--gol-teal)">
            Free together {{ formatWindow(f.freeTogether[0]) }}
          </span>
        </span>
        <input v-model="picked" class="form-check-input fs-5 m-0" type="checkbox" :value="f.uid" :aria-label="'Invite ' + f.name" />
      </label>
    </div>

    <div v-if="error" class="alert alert-danger small py-2 mt-2 mb-0">{{ error }}</div>
    <button v-if="friendList.length" class="gol-btn-primary mt-3" :disabled="!picked.length || sending" @click="send">
      {{ sending ? 'Sending…' : picked.length ? `Send ${picked.length} invite${picked.length > 1 ? 's' : ''}` : 'Pick friends to invite' }}
    </button>
  </BottomSheet>
</template>
