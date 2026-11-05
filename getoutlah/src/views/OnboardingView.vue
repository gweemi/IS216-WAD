<script setup>
// Shown once, right after a new user's first log-in.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { savePreferences } from '@/services/preferences'
import { logOut } from '@/services/auth'
import PreferencesForm from '@/components/PreferencesForm.vue'
import LogoutConfirmDialog from '@/components/common/LogoutConfirmDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const saving = ref(false)
const error = ref('')
const logoutOpen = ref(false)
const loggingOut = ref(false)
const logoutError = ref('')

// Full name, since splitting off a "first name" breaks names like "En Min Seah".
const name = auth.profile?.displayName || auth.user?.displayName || ''

// Lets someone leave the questionnaire, e.g. if they picked the wrong Google account.
function requestLogOut() {
  logoutError.value = ''
  logoutOpen.value = true
}

async function confirmLogOut() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    await logOut()
  } catch {
    if (auth.isLoggedIn) {
      logoutError.value = 'Couldn’t log you out. Please try again.'
      return
    }
  } finally {
    loggingOut.value = false
  }

  logoutOpen.value = false
  await router.replace({ name: 'login' })
}

async function onSubmit(answers) {
  saving.value = true
  error.value = ''
  try {
    await savePreferences(answers)
    router.replace({ name: 'map' })
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
  <main class="onboarding-page gol-page">
    <div class="onboarding-column">
      <header class="welcome">
        <img class="onboarding-logo" src="/logo.png" alt="GETOUTLAH!" />
        <h1 class="onboarding-title" data-testid="onboarding-welcome">
          Welcome{{ name ? `, ${name}` : '' }}!<br />
          Let's set you up.
        </h1>
        <p class="onboarding-account">
          Signing in as {{ auth.email }}.
          <button
            type="button"
            class="link-logout"
            data-testid="onboarding-logout"
            @click="requestLogOut"
          >
            Not you? Log out
          </button>
        </p>
      </header>

      <section class="gol-card onboarding-card">
        <PreferencesForm
          :saving="saving"
          :error="error"
          submit-label="Start exploring"
          @submit="onSubmit"
        />
      </section>
    </div>
    <LogoutConfirmDialog
      :open="logoutOpen"
      :busy="loggingOut"
      :error="logoutError"
      @cancel="logoutOpen = false"
      @confirm="confirmLogOut"
    />
  </main>
</template>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 3.5rem 1rem;
}
.onboarding-column {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.welcome {
  padding: 0 .35rem;
  text-align: center;
}
.onboarding-logo { display: block; width: min(10rem, 45vw); height: auto; margin: 0 auto .75rem; }
.onboarding-title {
  margin: 0;
  color: var(--gol-ink);
  font: 900 clamp(1.25rem, 3vw, 1.55rem)/1.2 var(--gol-font);
}
.onboarding-account {
  margin: .7rem 0 0;
  color: var(--gol-muted);
  font-size: .78rem;
  font-weight: 700;
}
.onboarding-card {
  padding: 1.5rem;
  border: 2px solid rgba(107, 66, 227, .08);
}
.link-logout {
  border: 0;
  padding: 0;
  color: var(--gol-purple);
  background: transparent;
  font: inherit;
  font-weight: 900;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.link-logout:hover { color: var(--gol-purple-dark); }
.link-logout:focus-visible { outline: 3px solid rgba(107, 66, 227, .38); outline-offset: 2px; border-radius: 3px; }
@media (min-width: 576px) {
  .onboarding-page { padding: 4rem 1.5rem; }
  .onboarding-card { padding: 2.1rem 2.3rem 1.9rem; }
}
@media (max-width: 575px) {
  .onboarding-page {
    padding: 1.75rem 1rem;
  }
}
</style>
