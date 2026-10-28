<!-- Notifications: friend requests, accepted requests and activity invites. -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { friendsState, unreadCount, relationshipWith } from '@/stores/friends'
import { acceptFriendRequest, removeFriendship, markRead, markAllRead, deleteNotification } from '@/services/friends'
import { pairId, timeAgo, toMillis } from '@/utils/friends'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'

const router = useRouter()
const busy = ref('')
const error = ref('')

const TEXT = {
  friend_request: 'sent you a friend request',
  friend_accepted: 'accepted your friend request',
  activity_invite: 'invited you to',
}

async function run(id, fn) {
  busy.value = id
  error.value = ''
  try {
    await fn()
  } catch (e) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    busy.value = ''
  }
}

// Tapping a notification marks it read and opens what it's about.
function open(n) {
  if (!n.read) markRead([n.id]).catch(() => {})
  if (n.type === 'activity_invite' && n.activityId) router.push({ name: 'activity', params: { id: n.activityId } })
  else if (n.type === 'friend_accepted') router.push({ name: 'friends' })
}

const requestPending = (n) => n.type === 'friend_request' && relationshipWith(n.from) === 'received'
const requestId = (n) => pairId(n.from, friendsState.uid)
</script>

<template>
  <main class="gol-page" data-testid="notifications-page">
    <div class="container py-3 py-md-4" style="max-width: 720px">
      <RouterLink :to="{ name: 'friends' }" class="fw-bolder text-decoration-none" style="color: var(--gol-purple)">
        <i class="bi bi-arrow-left"></i> Friends
      </RouterLink>

      <header class="d-flex flex-wrap justify-content-between align-items-end gap-2 mt-2 mb-3">
        <div>
          <p class="gol-eyebrow">What's new</p>
          <h1 class="gol-title">Notifications</h1>
        </div>
        <button v-if="unreadCount" class="gol-btn-soft" @click="run('all', markAllRead)">Mark all read</button>
      </header>

      <div v-if="error" class="alert alert-danger small py-2">{{ error }}</div>

      <div v-if="!friendsState.notifications.length" class="gol-card d-flex align-items-center gap-3 text-muted fw-semibold">
        <span class="gol-icon-tile" style="background: var(--gol-yellow)" aria-hidden="true"><i class="bi bi-bell"></i></span>
        <p class="mb-0">Nothing yet. Friend requests and activity invites will show up here.</p>
      </div>

      <ul v-else class="list-unstyled d-flex flex-column gap-2 mb-0" data-testid="notification-list">
        <li
          v-for="n in friendsState.notifications"
          :key="n.id"
          class="gol-card p-3"
          :style="n.read ? null : { background: '#fffaf0', boxShadow: '0 4px 0 var(--gol-yellow)' }"
        >
          <button class="btn p-0 border-0 w-100 text-start d-flex align-items-center gap-3" @click="open(n)">
            <FriendAvatar :name="n.fromName" :photo="n.fromPhoto" :size="44" />
            <span class="flex-grow-1 d-flex flex-column fw-semibold" style="min-width: 0">
              <span>
                <strong>{{ n.fromName }}</strong> {{ TEXT[n.type] || 'sent you something' }}
                <strong v-if="n.type === 'activity_invite'">{{ n.activityTitle }}</strong>
              </span>
              <span class="small text-muted fw-bold">{{ timeAgo(toMillis(n.createdAt)) }}</span>
            </span>
            <span
              v-if="!n.read"
              class="rounded-circle flex-shrink-0"
              style="width: 10px; height: 10px; background: var(--gol-coral)"
              aria-label="Unread"
            ></span>
          </button>

          <!-- Buttons line up under the text (indented past the photo from small screens up) -->
          <div v-if="requestPending(n)" class="d-flex gap-2 mt-3 ps-sm-5 ms-sm-2">
            <button class="gol-btn-coral" :disabled="busy === n.id" @click="run(n.id, () => acceptFriendRequest(requestId(n)))">Accept</button>
            <button class="gol-btn-soft" :disabled="busy === n.id" @click="run(n.id, () => removeFriendship(requestId(n)))">Decline</button>
          </div>
          <div v-else-if="n.type === 'activity_invite'" class="d-flex align-items-center gap-2 mt-3 ps-sm-5 ms-sm-2">
            <button class="gol-btn-soft" @click="open(n)"><i class="bi bi-stars"></i> View activity</button>
            <button class="btn btn-sm btn-link text-muted ms-auto" aria-label="Delete notification" @click="run(n.id, () => deleteNotification(n.id))">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </main>
</template>
