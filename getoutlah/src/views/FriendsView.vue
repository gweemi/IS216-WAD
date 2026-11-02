<!--
  Friends tab: add friends by email, answer requests, see when you're both free.
  Layout: one column on phones, two columns from large screens (Bootstrap grid).
  Notifications (bell, top right) live at /notifications.
-->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { friendsState, friendList, incomingRequests, outgoingRequests, unreadCount, relationshipWith } from '@/stores/friends'
import {
  findUserByEmail, suggestedPeople, sendFriendRequest, acceptFriendRequest, removeFriendship,
} from '@/services/friends'
import { formatWindow } from '@/utils/friends'
import FriendAvatar from '@/components/friends/FriendAvatar.vue'
import FreeTimeCard from '@/components/friends/FreeTimeCard.vue'
import BottomSheet from '@/components/common/BottomSheet.vue'

const auth = useAuthStore()

// ---- add by email ----
const email = ref('')
const searching = ref(false)
const addMsg = ref({ text: '', ok: true })

async function addByEmail() {
  addMsg.value = { text: '', ok: true }
  searching.value = true
  try {
    const person = await findUserByEmail(email.value)
    if (!person) throw new Error('No one with that email has joined GetOutLah! yet.')
    await sendFriendRequest(person)
    addMsg.value = { text: `Friend request sent to ${person.displayName}!`, ok: true }
    email.value = ''
  } catch (e) {
    addMsg.value = { text: e.message || 'Something went wrong. Please try again.', ok: false }
  } finally {
    searching.value = false
  }
}

// ---- suggestions from the same university ----
const suggestions = ref([])
async function loadSuggestions() {
  try {
    suggestions.value = await suggestedPeople(auth.profile?.universityId)
  } catch {
    suggestions.value = []
  }
}
onMounted(loadSuggestions)
watch(() => friendsState.ready, (ready) => ready && loadSuggestions())
const visibleSuggestions = computed(() => suggestions.value.filter((p) => relationshipWith(p.uid) === 'none'))

// ---- actions ----
const busy = ref('')
const actionError = ref('')
async function run(id, fn) {
  busy.value = id
  actionError.value = ''
  try {
    await fn()
  } catch (e) {
    actionError.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    busy.value = ''
  }
}

const selected = ref(null) // friend shown in the bottom sheet
async function unfriend() {
  const f = selected.value
  await run(f.id, () => removeFriendship(f.id))
  selected.value = null
}
</script>

<template>
  <main class="gol-page" data-testid="friends-page">
    <div class="container py-3 py-md-4" style="max-width: 1100px">
      <!-- Header + bell -->
      <header class="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <p class="gol-eyebrow">Your crew</p>
          <h1 class="gol-title">Friends</h1>
        </div>
        <RouterLink
          :to="{ name: 'notifications' }"
          class="gol-icon-tile position-relative rounded-circle bg-white text-decoration-none"
          style="width: 48px; height: 48px"
          aria-label="Notifications"
          data-testid="open-notifications"
        >
          <i class="bi bi-bell"></i>
          <span
            v-if="unreadCount"
            class="position-absolute top-0 start-100 translate-middle badge rounded-pill border border-2 border-white"
            style="background: var(--gol-coral)"
          >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </RouterLink>
      </header>

      <div v-if="friendsState.error" class="alert alert-warning small">{{ friendsState.error }}</div>
      <div v-if="actionError" class="alert alert-danger small py-2">{{ actionError }}</div>

      <div class="row g-3">
        <!-- Left column (full width on phones) -->
        <div class="col-12 col-lg-7 d-flex flex-column gap-3">
          <!-- Requests waiting for me -->
          <section
            v-if="incomingRequests.length"
            class="gol-card border border-2"
            style="border-color: var(--gol-coral) !important"
            data-testid="incoming-requests"
          >
            <h2 class="gol-section-title mb-2">
              Friend requests
              <span class="badge rounded-pill align-middle" style="background: var(--gol-coral)">{{ incomingRequests.length }}</span>
            </h2>
            <ul class="list-unstyled mb-0 d-flex flex-column gap-2">
              <li v-for="r in incomingRequests" :key="r.id" class="d-flex flex-wrap align-items-center gap-2 gap-sm-3">
                <FriendAvatar :name="r.name" :photo="r.photoURL" />
                <div class="flex-grow-1" style="min-width: 0">
                  <div class="fw-bolder text-truncate">{{ r.name }}</div>
                  <div class="small text-muted fw-semibold">
                    {{ r.universityName ? r.universityName + ' · ' : '' }}wants to be friends
                  </div>
                </div>
                <div class="d-flex gap-2 ms-auto">
                  <button class="gol-btn-coral" :disabled="busy === r.id" @click="run(r.id, () => acceptFriendRequest(r.id))">Accept</button>
                  <button class="gol-btn-soft" aria-label="Decline" :disabled="busy === r.id" @click="run(r.id, () => removeFriendship(r.id))">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <!-- My friends -->
          <section class="gol-card">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <h2 class="gol-section-title">Your friends</h2>
              <span class="small fw-bolder" style="color: var(--gol-purple)">{{ friendList.length }}</span>
            </div>

            <p v-if="!friendsState.ready && !friendsState.error" class="text-muted fw-semibold mb-0">
              <span class="spinner-border spinner-border-sm me-2"></span>Loading…
            </p>
            <div v-else-if="!friendList.length" class="d-flex align-items-center gap-3 text-muted fw-semibold">
              <span class="gol-icon-tile" style="background: var(--gol-yellow)" aria-hidden="true"><i class="bi bi-people"></i></span>
              <p class="mb-0">No friends yet. Add someone by their email to start planning things together.</p>
            </div>

            <div
              v-else
              class="list-group list-group-flush gap-1"
              style="--bs-list-group-bg: transparent; --bs-list-group-color: var(--gol-ink); --bs-list-group-action-hover-bg: var(--gol-purple-soft); --bs-list-group-action-active-bg: var(--gol-purple-soft)"
              data-testid="friend-list"
            >
              <button
                v-for="f in friendList"
                :key="f.id"
                type="button"
                class="list-group-item list-group-item-action d-flex align-items-center gap-3 px-2 border-0 rounded-4"
                @click="selected = f"
              >
                <FriendAvatar :name="f.name" :photo="f.photoURL" />
                <div class="flex-grow-1" style="min-width: 0">
                  <div class="fw-bolder text-truncate">{{ f.name }}</div>
                  <div v-if="f.freeTogether.length" class="small fw-bold" style="color: var(--gol-teal)">
                    <i class="bi bi-calendar-check"></i> Free together {{ formatWindow(f.freeTogether[0]) }}
                  </div>
                  <div v-else class="small text-muted fw-semibold">{{ f.universityName || 'GetOutLah! friend' }}</div>
                </div>
                <i class="bi bi-chevron-right text-muted" aria-hidden="true"></i>
              </button>
            </div>
          </section>

          <!-- Requests I sent -->
          <section v-if="outgoingRequests.length" class="gol-card">
            <h2 class="gol-section-title mb-2">Waiting for a reply</h2>
            <ul class="list-unstyled mb-0 d-flex flex-column gap-2">
              <li v-for="r in outgoingRequests" :key="r.id" class="d-flex align-items-center gap-3">
                <FriendAvatar :name="r.name" :photo="r.photoURL" :size="40" />
                <div class="flex-grow-1 fw-bolder text-truncate">{{ r.name }}</div>
                <button class="gol-btn-soft" :disabled="busy === r.id" @click="run(r.id, () => removeFriendship(r.id))">Cancel</button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Right column (below the left one on phones) -->
        <div class="col-12 col-lg-5 d-flex flex-column gap-3">
          <!-- Add a friend -->
          <section class="gol-card">
            <h2 class="gol-section-title mb-2"><i class="bi bi-person-plus me-1"></i> Add a friend</h2>
            <form class="d-flex gap-2" @submit.prevent="addByEmail">
              <input
                v-model="email"
                type="email"
                class="form-control rounded-pill"
                placeholder="friend@smu.edu.sg"
                aria-label="Friend's email"
                required
                data-testid="friend-email"
              />
              <button type="submit" class="gol-btn-coral" :disabled="searching">{{ searching ? 'Sending…' : 'Send' }}</button>
            </form>
            <p
              v-if="addMsg.text"
              class="small fw-bold mt-2 mb-0"
              :style="{ color: addMsg.ok ? 'var(--gol-teal)' : 'var(--gol-coral-text)' }"
            >{{ addMsg.text }}</p>
          </section>

          <FreeTimeCard />

          <!-- People from the same university -->
          <section v-if="visibleSuggestions.length" class="gol-card">
            <h2 class="gol-section-title mb-2">From {{ auth.profile?.universityName }}</h2>
            <ul class="list-unstyled mb-0 d-flex flex-column gap-2">
              <li v-for="p in visibleSuggestions" :key="p.uid" class="d-flex align-items-center gap-3">
                <FriendAvatar :name="p.displayName" :photo="p.photoURL" :size="40" />
                <div class="flex-grow-1 fw-bolder text-truncate">{{ p.displayName }}</div>
                <button class="gol-btn-soft" :disabled="busy === p.uid" @click="run(p.uid, () => sendFriendRequest(p))">
                  <i class="bi bi-person-plus"></i> Add
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>

    <!-- Friend details (slides up on phones, centred pop-up on laptops) -->
    <BottomSheet :open="!!selected" label="Friend details" @close="selected = null">
      <template v-if="selected">
        <div class="d-flex justify-content-end">
          <button class="gol-close" aria-label="Close" @click="selected = null"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="text-center mb-3">
          <FriendAvatar :name="selected.name" :photo="selected.photoURL" :size="84" />
          <h2 class="gol-title mt-2">{{ selected.name }}</h2>
          <p v-if="selected.universityName" class="small text-muted fw-semibold mb-0">{{ selected.universityName }}</p>
        </div>

        <div class="gol-card mb-3">
          <h3 class="gol-section-title fs-6 mb-2">Free at the same time as you</h3>
          <ul v-if="selected.freeTogether.length" class="list-unstyled mb-0 d-flex flex-column gap-1 fw-bold">
            <li v-for="w in selected.freeTogether" :key="w.start">
              <i class="bi bi-calendar-check" style="color: var(--gol-teal)"></i> {{ formatWindow(w) }}
            </li>
          </ul>
          <p v-else class="small text-muted fw-semibold mb-0">
            No overlap yet. Add when you're free on the Friends page and you'll see times that match.
          </p>
        </div>

        <RouterLink :to="{ name: 'activities' }" class="gol-btn-primary text-center text-decoration-none mb-2" @click="selected = null">
          Find something to do together
        </RouterLink>
        <button
          class="btn btn-link w-100 fw-bolder text-decoration-none"
          style="color: var(--gol-coral-text)"
          :disabled="busy === selected.id"
          @click="unfriend"
        >Remove friend</button>
      </template>
    </BottomSheet>
  </main>
</template>
