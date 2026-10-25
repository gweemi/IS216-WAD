<script setup>
// Shown once, right after a new user's first log-in.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { savePreferences } from '@/services/preferences'
import { logOut } from '@/services/auth'
import PreferencesForm from '@/components/PreferencesForm.vue'

const router = useRouter()
const auth = useAuthStore()
const saving = ref(false)
const error = ref('')

// Full name, since splitting off a "first name" breaks names like "En Min Seah".
const name = auth.profile?.displayName || auth.user?.displayName || ''

// Lets someone leave the questionnaire, e.g. if they picked the wrong Google account.
async function onLogOut() {
  await logOut()
  router.replace({ name: 'auth' })
}

async function onSubmit(answers) {
  saving.value = true
  error.value = ''
  try {
    await savePreferences(answers)
    router.replace({ name: 'home' })
  } catch (err) {
    error.value =
      err?.code === 'permission-denied'
        ? "Couldn't save your answers. Please try again."
        : err?.message || 'Something went wrong. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="onboarding-page">
    <div class="onboarding-column">
      <header class="welcome text-center">
        <p class="font-display fw-bold mb-1" style="color: var(--go-green)">GETOUTLAH!</p>
        <h1 class="h4 fw-semibold mb-0" data-testid="onboarding-welcome">
          Welcome{{ name ? `, ${name}` : '' }}! Let's set you up.
        </h1>
        <p class="text-secondary small mb-0">3 quick questions, under a minute.</p>
        <p class="small text-secondary mt-2 mb-0">
          Signed in as {{ auth.email }}.
          <button
            type="button"
            class="btn btn-link btn-sm p-0 align-baseline link-logout"
            data-testid="onboarding-logout"
            @click="onLogOut"
          >
            Not you? Log out
          </button>
        </p>
      </header>

      <section class="go-card onboarding-card">
        <PreferencesForm
          :saving="saving"
          :error="error"
          submit-label="Start exploring"
          @submit="onSubmit"
        />
      </section>
    </div>
  </main>
</template>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}
.onboarding-column {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.onboarding-card {
  padding: 2rem 1.5rem 1.5rem;
}
.link-logout {
  color: var(--go-green);
  font-size: inherit;
}
@media (min-width: 576px) {
  .onboarding-card {
    padding: 2.25rem 2.5rem 1.75rem;
  }
}
@media (max-width: 575px) {
  .onboarding-page {
    padding: 1.5rem 1rem;
  }
}
</style>
