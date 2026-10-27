<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithGoogle, friendlyError, isCancelled } from '@/services/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')

async function onGoogle() {
  error.value = ''
  loading.value = true
  try {
    await signInWithGoogle()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/map'
    router.push(redirect)
  } catch (err) {
    if (!isCancelled(err)) error.value = friendlyError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-column">
      <!-- Banner -->
      <header class="brand-banner" aria-label="GETOUTLAH!">
        <h1 class="brand-logo font-display mb-0">GETOUTLAH!</h1>
        <p class="brand-tagline mb-0">Exams done. Now go out.</p>
      </header>

      <!-- Log-in card -->
      <section class="go-card auth-card text-center">
        <h2 class="h3 font-display fw-bold mb-2" data-testid="auth-title">Welcome</h2>
        <p class="text-secondary mb-4">Log in or sign up with your Google account.</p>

        <div
          v-if="error"
          class="alert alert-danger py-2 small text-start"
          role="alert"
          data-testid="auth-error"
        >
          {{ error }}
        </div>

        <button
          type="button"
          class="btn google-btn w-100"
          :disabled="loading"
          data-testid="google-signin"
          @click="onGoogle"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <svg v-else class="google-g" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span>{{ loading ? 'Waiting for Google…' : 'Continue with Google' }}</span>
        </button>

        <p class="text-secondary small mt-4 mb-0">
          Your first log-in creates your account. Using a university account (e.g.
          <strong>name@smu.edu.sg</strong>) lets you join OPENJIOs for your university.
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 3.5rem 1rem;
}
.auth-column {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Banner */
.brand-banner {
  background: var(--go-green);
  color: #fff;
  border-radius: var(--go-radius);
  padding: 2.25rem 1.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
/* Soft sun in the corner */
.brand-banner::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: var(--go-lime);
  opacity: 0.18;
  right: -90px;
  bottom: -150px;
}
.brand-logo {
  position: relative;
  z-index: 1;
  font-weight: 800;
  font-size: clamp(2.5rem, 8vw, 4rem);
  line-height: 1;
  color: var(--go-lime);
}
.brand-tagline {
  position: relative;
  z-index: 1;
  margin-top: 0.6rem;
  font-size: 1rem;
  opacity: 0.88;
}

/* Card */
.auth-card {
  padding: 2rem 1.5rem 1.75rem;
}
@media (min-width: 576px) {
  .auth-card {
    padding: 2.5rem 3rem 2rem;
  }
}

/* Google button: white with the coloured G, as Google's sign-in guidelines ask */
.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: #fff;
  color: #1f1f1f;
  border: 1px solid #747775;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  font-size: 1rem;
}
.google-btn:hover:not(:disabled) {
  background: #f6f8f6;
  border-color: var(--go-green);
}
.google-btn:focus-visible {
  outline: 3px solid rgba(31, 107, 71, 0.35);
  outline-offset: 2px;
}
.google-btn:disabled {
  opacity: 0.75;
}
.google-g {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

@media (max-width: 575px) {
  .auth-page {
    padding: 1.25rem 1rem;
  }
  .auth-column {
    gap: 1.25rem;
  }
  .brand-banner {
    padding: 1.5rem 1rem;
  }
}
</style>
