<script setup>
// Placeholder home page so the log-in flow has somewhere to land.
// Replace with the real recommendations page next.
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ensureUserProfile, logOut } from '@/services/auth'

const router = useRouter()
const auth = useAuthStore()
const profile = ref(null)

onMounted(async () => {
  profile.value = await ensureUserProfile(auth.user)
})

async function onLogOut() {
  await logOut()
  router.replace({ name: 'auth' })
}
</script>

<template>
  <main class="container py-5" style="max-width: 720px">
    <div class="go-card p-4 p-md-5">
      <p class="font-display fw-bold mb-3" style="color: var(--go-green)">GETOUTLAH!</p>
      <div class="d-flex align-items-center gap-3 mb-3">
        <img
          v-if="auth.user?.photoURL"
          :src="auth.user.photoURL"
          alt=""
          width="56"
          height="56"
          class="rounded-circle"
          referrerpolicy="no-referrer"
        />
        <h1 class="h2 font-display fw-bold mb-0" data-testid="home-greeting">
          Hi {{ profile?.displayName || auth.user?.displayName || 'there' }}
        </h1>
      </div>
      <p class="text-secondary mb-4" data-testid="home-university">
        Logged in as {{ auth.email }}
        <span v-if="profile?.universityName"> ({{ profile.universityName }} student)</span>.
      </p>
      <p class="mb-4">Recommendations go here next.</p>
      <button class="btn btn-outline-dark" data-testid="logout" @click="onLogOut">Log out</button>
    </div>
  </main>
</template>
