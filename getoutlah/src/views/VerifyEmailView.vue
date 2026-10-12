<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkVerified, resendVerification, logOut, friendlyError } from '@/services/auth'

const RESEND_COOLDOWN = 60 // seconds

const router = useRouter()
const auth = useAuthStore()

const checking = ref(false)
const message = ref('')
const error = ref('')
const cooldown = ref(RESEND_COOLDOWN) // an email was just sent on sign-up
let cooldownTimer
let pollTimer

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

async function onContinue({ silent = false } = {}) {
  if (!silent) {
    checking.value = true
    error.value = ''
    message.value = ''
  }
  try {
    if (await checkVerified()) {
      router.replace({ name: 'home' })
    } else if (!silent) {
      message.value =
        "We can't see the verification yet. Click the link in the email, then try again."
    }
  } catch (err) {
    if (!silent) error.value = friendlyError(err)
  } finally {
    checking.value = false
  }
}

async function onResend() {
  error.value = ''
  message.value = ''
  try {
    await resendVerification()
    message.value = 'Sent! Check your school inbox (and the junk folder).'
    startCooldown()
  } catch (err) {
    error.value = friendlyError(err)
  }
}

async function onUseDifferentEmail() {
  await logOut()
  router.replace({ name: 'auth', query: { mode: 'signup' } })
}

onMounted(() => {
  startCooldown()
  // Check quietly every 5 s, so the page moves on by itself once they click the link.
  pollTimer = setInterval(() => onContinue({ silent: true }), 5000)
})
onBeforeUnmount(() => {
  clearInterval(cooldownTimer)
  clearInterval(pollTimer)
})
</script>

<template>
  <main class="verify-page">
    <div class="go-card verify-card p-4 p-md-5 text-center">
      <p class="font-display fw-bold mb-4" style="color: var(--go-green)">GETOUTLAH!</p>
      <div class="mail-icon mx-auto mb-3" aria-hidden="true">✉</div>
      <h1 class="h3 font-display fw-bold" data-testid="verify-title">Check your school inbox</h1>
      <p class="text-secondary">
        We sent a verification link to<br />
        <strong class="text-body" data-testid="verify-email">{{ auth.email }}</strong>
      </p>
      <p class="text-secondary small">
        Click the link, then come back here. This page will move on by itself once you're verified.
      </p>

      <div
        v-if="message"
        class="alert alert-info py-2 small"
        role="status"
        data-testid="verify-message"
      >
        {{ message }}
      </div>
      <div v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</div>

      <button
        class="btn btn-primary w-100 py-2"
        :disabled="checking"
        data-testid="verify-continue"
        @click="onContinue()"
      >
        <span
          v-if="checking"
          class="spinner-border spinner-border-sm me-2"
          aria-hidden="true"
        ></span>
        I've verified, continue
      </button>
      <button
        class="btn btn-outline-dark w-100 py-2 mt-2"
        :disabled="cooldown > 0"
        data-testid="verify-resend"
        @click="onResend"
      >
        {{ cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend email' }}
      </button>
      <button class="btn btn-link btn-sm mt-3" @click="onUseDifferentEmail">
        Use a different email
      </button>
    </div>
  </main>
</template>

<style scoped>
.verify-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
}
.verify-card {
  width: 100%;
  max-width: 460px;
}
.mail-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--go-lime);
  display: grid;
  place-items: center;
  font-size: 1.75rem;
}
</style>
