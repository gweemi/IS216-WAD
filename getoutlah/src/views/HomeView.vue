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
      <p class="font-display fw-bold mb-2" style="color: var(--go-green)">GETOUTLAH!</p>
      <h1 class="h2 font-display" data-testid="home-greeting">
        Hi {{ profile?.displayName || auth.user?.displayName || 'there' }}
      </h1>
      <p class="text-secondary mb-4" data-testid="home-university">
        Logged in with your {{ profile?.universityName }} email ({{ auth.email }}).
      </p>
      <p class="mb-4">Recommendations go here next.</p>
      <button class="btn btn-outline-dark" data-testid="logout" @click="onLogOut">Log out</button>
    </div>
  </main>
</template>
