<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUniversity } from '@/config/universities'
import {
  signUp,
  logIn,
  resetPassword,
  passwordProblem,
  friendlyError,
  MIN_PASSWORD_LENGTH,
} from '@/services/auth'

const route = useRoute()
const router = useRouter()

// 'login' | 'signup' | 'reset' — kept in the URL so /auth?mode=signup can be linked to.
const mode = ref(['signup', 'reset'].includes(route.query.mode) ? route.query.mode : 'login')
watch(mode, (m) =>
  router.replace({ query: { ...route.query, mode: m === 'login' ? undefined : m } }),
)

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const touched = reactive({ name: false, email: false, password: false, confirm: false })
const submitted = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const showPassword = ref(false)

function switchMode(m) {
  mode.value = m
  error.value = ''
  notice.value = ''
  submitted.value = false
  Object.keys(touched).forEach((k) => (touched[k] = false))
}

// ---------- Live validation ----------
const university = computed(() => getUniversity(form.email))

const errors = computed(() => {
  const e = {}
  if (!form.email.trim()) e.email = 'Enter your school email.'
  else if (!university.value) e.email = 'Only university emails can join, e.g. name@smu.edu.sg.'

  if (mode.value === 'reset') return e

  if (!form.password) e.password = 'Enter your password.'
  else if (mode.value === 'signup') {
    const p = passwordProblem(form.password)
    if (p) e.password = p
  }

  if (mode.value === 'signup') {
    if (!form.name.trim()) e.name = 'Tell us what to call you.'
    if (form.confirm !== form.password) e.confirm = "Passwords don't match."
  }
  return e
})

// Only show a field's error after the user leaves it or presses submit.
const show = (field) => (touched[field] || submitted.value) && errors.value[field]

const title = computed(
  () =>
    ({ login: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' })[
      mode.value
    ],
)
const submitLabel = computed(
  () => ({ login: 'Log in', signup: 'Sign up', reset: 'Send reset link' })[mode.value],
)

// ---------- Submit ----------
async function onSubmit() {
  submitted.value = true
  error.value = ''
  notice.value = ''
  if (Object.keys(errors.value).length) return

  loading.value = true
  try {
    if (mode.value === 'signup') {
      await signUp({ name: form.name, email: form.email, password: form.password })
      router.push({ name: 'verify-email' })
    } else if (mode.value === 'login') {
      const { needsVerification } = await logIn({ email: form.email, password: form.password })
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
      router.push(needsVerification ? { name: 'verify-email' } : redirect)
    } else {
      await resetPassword(form.email)
      // Same message whether or not the account exists, so emails can't be probed.
      notice.value =
        'If an account exists for that email, a reset link is on its way. Check your school inbox.'
    }
  } catch (err) {
    error.value = friendlyError(err)
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

      <!-- Form card -->
      <section class="go-card auth-card text-center">
        <h2 class="h3 font-display fw-bold mb-3" data-testid="auth-title">{{ title }}</h2>

        <div v-if="mode !== 'reset'" class="mode-tabs mb-4" role="tablist">
          <button
            type="button"
            role="tab"
            class="mode-tab"
            :class="{ active: mode === 'login' }"
            :aria-selected="mode === 'login'"
            data-testid="tab-login"
            @click="switchMode('login')"
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            class="mode-tab"
            :class="{ active: mode === 'signup' }"
            :aria-selected="mode === 'signup'"
            data-testid="tab-signup"
            @click="switchMode('signup')"
          >
            Sign up
          </button>
        </div>
        <p v-else class="text-secondary small mb-4">
          Enter your school email and we'll send you a link to set a new password.
        </p>

        <div
          v-if="error"
          class="alert alert-danger py-2 small"
          role="alert"
          data-testid="auth-error"
        >
          {{ error }}
        </div>
        <div
          v-if="notice"
          class="alert alert-success py-2 small"
          role="status"
          data-testid="auth-notice"
        >
          {{ notice }}
        </div>

        <form class="text-start" novalidate @submit.prevent="onSubmit">
          <!-- Name (sign up only) -->
          <div v-if="mode === 'signup'" class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="form-control"
              autocomplete="name"
              :class="{ 'is-invalid': show('name') }"
              data-testid="input-name"
              @blur="touched.name = true"
            />
            <div class="invalid-feedback">{{ errors.name }}</div>
          </div>

          <!-- School email -->
          <div class="mb-3">
            <label for="email" class="form-label">School email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-control"
              autocomplete="email"
              inputmode="email"
              placeholder="name@smu.edu.sg"
              :class="{ 'is-invalid': show('email'), 'is-valid': university }"
              data-testid="input-email"
              @blur="touched.email = true"
            />
            <div class="invalid-feedback" data-testid="email-error">{{ errors.email }}</div>
            <div v-if="university" class="valid-feedback" data-testid="email-university">
              {{ university.name }} email detected
            </div>
          </div>

          <!-- Password -->
          <div v-if="mode !== 'reset'" class="mb-3">
            <label for="password" class="form-label">Password</label>
            <div class="password-wrap">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
                :class="{ 'is-invalid': show('password') }"
                data-testid="input-password"
                @blur="touched.password = true"
              />
              <button
                type="button"
                class="btn btn-link btn-sm show-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
              <div class="invalid-feedback">{{ errors.password }}</div>
            </div>
            <div v-if="mode === 'signup' && !show('password')" class="form-text text-center">
              At least {{ MIN_PASSWORD_LENGTH }} characters, with a letter and a number.
            </div>
          </div>

          <!-- Confirm password (sign up only) -->
          <div v-if="mode === 'signup'" class="mb-3">
            <label for="confirm" class="form-label">Confirm password</label>
            <input
              id="confirm"
              v-model="form.confirm"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              autocomplete="new-password"
              :class="{ 'is-invalid': show('confirm') }"
              data-testid="input-confirm"
              @blur="touched.confirm = true"
            />
            <div class="invalid-feedback">{{ errors.confirm }}</div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 py-2 mt-1"
            :disabled="loading"
            data-testid="auth-submit"
          >
            <span
              v-if="loading"
              class="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            ></span>
            {{ submitLabel }}
          </button>
        </form>

        <p class="text-secondary small mt-3 mb-2">
          Only verified university emails can sign up. We send a verification link to your school
          inbox.
        </p>

        <button
          v-if="mode === 'login'"
          type="button"
          class="btn btn-link btn-sm link-ink"
          data-testid="link-forgot"
          @click="switchMode('reset')"
        >
          Forgot password?
        </button>
        <button
          v-if="mode === 'reset'"
          type="button"
          class="btn btn-link btn-sm link-ink"
          @click="switchMode('login')"
        >
          Back to log in
        </button>
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
  padding: 2rem 1.5rem 1.5rem;
}
@media (min-width: 576px) {
  .auth-card {
    padding: 2.25rem 2rem 1.5rem;
  }
}

.form-label {
  display: block;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
}
.invalid-feedback,
.valid-feedback {
  text-align: center;
}

.password-wrap {
  position: relative;
}
.password-wrap .form-control {
  padding-right: 4rem;
}
/* Hide Bootstrap's error icon here so it doesn't clash with the Show button */
.password-wrap .form-control.is-invalid {
  padding-right: 4rem;
  background-image: none;
}
.show-toggle {
  position: absolute;
  top: 0.3rem;
  right: 0.4rem;
  color: var(--go-muted);
  text-decoration: none;
}

.mode-tabs {
  display: inline-flex;
  gap: 0.4rem;
}
.mode-tab {
  border: 1px solid var(--go-line);
  background: #fff;
  border-radius: 999px;
  padding: 0.3rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--go-muted);
}
.mode-tab.active {
  background: var(--go-ink);
  border-color: var(--go-ink);
  color: #fff;
}

.link-ink {
  color: var(--go-ink);
  font-weight: 500;
  text-decoration: none;
}
.link-ink:hover {
  color: var(--go-green);
  text-decoration: underline;
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