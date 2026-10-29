<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithGoogle, friendlyError, isCancelled } from '@/services/auth'
import { burstFrom, celebrateCheckIn } from '@/utils/celebrate'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const success = ref(false)
const error = ref('')

const LOGO = 'GETOUTLAH!'.split('')

// Floating activity stickers around the logo
const STICKERS = [
  { emoji: '🌳', color: 'var(--gol-lime)', label: 'Outdoors', pos: 's1' },
  { emoji: '🎨', color: '#ffb8d1', label: 'Arts', pos: 's2' },
  { emoji: '🍜', color: 'var(--gol-coral)', label: 'Food', pos: 's3' },
  { emoji: '🏃', color: 'var(--gol-cyan)', label: 'Sports', pos: 's4' },
  { emoji: '🎲', color: 'var(--gol-yellow)', label: 'Games', pos: 's5' },
  { emoji: '🧘', color: '#d8f6f8', label: 'Wellness', pos: 's6' },
]
const popped = ref(null)
function pop(sticker, e) {
  popped.value = sticker.pos
  try {
    burstFrom(e.currentTarget)
  } catch {
    /* confetti is only decoration */
  }
  setTimeout(() => (popped.value = null), 600)
}

// "Exams done. Now go out ___" cycles through these
const IDEAS = ['hiking 🌿', 'café hopping ☕', 'bouldering 🧗', 'to a gig 🎸', 'with friends 🫶', 'and touch grass 🌱']
const idea = ref(0)
let timer = null
onMounted(() => {
  timer = setInterval(() => (idea.value = (idea.value + 1) % IDEAS.length), 2200)
})
onBeforeUnmount(() => clearInterval(timer))

const PERKS = [
  { icon: 'bi-compass', color: 'var(--gol-cyan)', title: 'Find stuff to do', text: 'Picked for your vibe & budget' },
  { icon: 'bi-trophy', color: 'var(--gol-yellow)', title: 'Earn badges', text: 'Points, streaks, levels' },
  { icon: 'bi-people', color: 'var(--gol-coral)', title: 'OPENJIO!', text: 'Rope in friends, or make new ones' },
]

async function onGoogle() {
  error.value = ''
  loading.value = true
  try {
    await signInWithGoogle()
    success.value = true
    try {
      celebrateCheckIn()
    } catch {
      /* decoration only */
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/map'
    // A short moment to enjoy the confetti
    await new Promise((r) => setTimeout(r, 700))
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
    <div class="auth-layout">
      <!-- Left / top: the fun bit -->
      <header class="hero" aria-label="GETOUTLAH!">
        <span class="blob blob-a" aria-hidden="true"></span>
        <span class="blob blob-b" aria-hidden="true"></span>

        <button
          v-for="(s, i) in STICKERS"
          :key="s.pos"
          type="button"
          class="sticker"
          :class="[s.pos, { popped: popped === s.pos }]"
          :style="{ background: s.color, '--d': i * 0.4 + 's' }"
          :aria-label="s.label + ' (tap me)'"
          @click="pop(s, $event)"
        >
          {{ s.emoji }}
        </button>

        <div class="hero-text">
          <p class="hero-eyebrow">For uni students in Singapore</p>
          <h1 class="logo" aria-label="GETOUTLAH!">
            <span v-for="(ch, i) in LOGO" :key="i" class="logo-ch" :style="{ '--i': i }" aria-hidden="true">{{ ch }}</span>
          </h1>
          <p class="tagline">
            Exams done. Now go out
            <span class="idea-slot">
              <Transition name="idea" mode="out-in">
                <span :key="idea" class="idea">{{ IDEAS[idea] }}</span>
              </Transition>
            </span>
          </p>
        </div>
      </header>

      <!-- Right / bottom: log-in card -->
      <section class="auth-card" :class="{ 'is-success': success }">
        <p class="gol-eyebrow mb-1">Let's go</p>
        <h2 class="gol-title mb-2" data-testid="auth-title">{{ success ? 'You’re in! 🎉' : 'Welcome in' }}</h2>
        <p class="muted mb-4">Log in or sign up with your Google account. It takes two taps.</p>

        <div v-if="error" class="error-box mb-3" role="alert" data-testid="auth-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>

        <!-- White with the coloured G, as Google's sign-in guidelines ask -->
        <button
          type="button"
          class="google-btn"
          :disabled="loading || success"
          data-testid="google-signin"
          @click="onGoogle"
        >
          <span v-if="loading && !success" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else-if="success" class="bi bi-check-circle-fill ok-icon" aria-hidden="true"></i>
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
          <span>{{ success ? 'Taking you in…' : loading ? 'Waiting for Google…' : 'Continue with Google' }}</span>
        </button>

        <ul class="perks list-unstyled mt-4 mb-0">
          <li v-for="(p, i) in PERKS" :key="p.title" class="perk" :style="{ '--i': i }">
            <span class="gol-icon-tile perk-tile" :style="{ background: p.color }"><i class="bi" :class="p.icon"></i></span>
            <span>
              <span class="d-block perk-title">{{ p.title }}</span>
              <span class="d-block perk-text">{{ p.text }}</span>
            </span>
          </li>
        </ul>

        <p class="fine-print mt-4 mb-0">
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
  font-family: var(--gol-font);
  color: var(--gol-ink);
  background: var(--gol-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
.auth-layout {
  width: 100%;
  max-width: 1040px;
  display: grid;
  gap: 1.25rem;
}
@media (min-width: 900px) {
  .auth-layout {
    grid-template-columns: 1.1fr 1fr;
    gap: 2rem;
    align-items: stretch;
  }
}
.muted { color: var(--gol-muted); font-weight: 600; }

/* ---------- Hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 30px;
  background: linear-gradient(150deg, var(--gol-purple) 0%, var(--gol-purple-dark) 100%);
  box-shadow: 0 6px 0 #2f1785;
  color: #fff;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5.5rem 1.25rem;
  text-align: center;
}
@media (min-width: 900px) {
  .hero { min-height: 560px; }
}
.blob { position: absolute; border-radius: 46% 54% 60% 40%; }
.blob-a {
  width: 220px; height: 220px; right: -80px; bottom: -90px;
  background: var(--gol-coral); opacity: 0.9;
  animation: spin 18s linear infinite;
}
.blob-b {
  width: 120px; height: 120px; left: -50px; top: -40px;
  background: var(--gol-lime); opacity: 0.85;
  animation: spin 24s linear infinite reverse;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hero-text { position: relative; z-index: 2; }
.hero-eyebrow {
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--gol-yellow); margin-bottom: 0.4rem;
}

/* Letters drop in one by one, then bob */
.logo {
  font-weight: 900;
  font-size: clamp(2.6rem, 9vw, 4.6rem);
  line-height: 1;
  margin: 0;
  color: var(--gol-lime);
  text-shadow: 4px 4px 0 var(--gol-ink);
  white-space: nowrap;
}
.logo-ch {
  display: inline-block;
  animation:
    drop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    bob 3s ease-in-out infinite;
  animation-delay: calc(var(--i) * 60ms), calc(0.8s + var(--i) * 120ms);
}
.logo-ch:last-child { color: var(--gol-yellow); }
@keyframes drop-in {
  from { opacity: 0; transform: translateY(-60px) rotate(-12deg) scale(0.6); }
  to { opacity: 1; transform: none; }
}
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.tagline { margin: 0.9rem 0 0; font-weight: 700; font-size: 1.05rem; }
.idea-slot { display: inline-block; min-width: 9.5em; text-align: left; }
.idea {
  display: inline-block;
  background: #fff;
  color: var(--gol-purple);
  border-radius: 999px;
  padding: 0.1rem 0.65rem;
  font-weight: 900;
}
.idea-enter-active, .idea-leave-active { transition: opacity 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.idea-enter-from { opacity: 0; transform: translateY(12px) rotate(4deg); }
.idea-leave-to { opacity: 0; transform: translateY(-12px) rotate(-4deg); }

/* Floating stickers (tap for confetti) */
.sticker {
  position: absolute;
  z-index: 1;
  width: 58px;
  height: 58px;
  border-radius: 16px;
  border: 2.5px solid var(--gol-ink);
  box-shadow: 4px 4px 0 var(--gol-ink);
  font-size: 1.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation:
    sticker-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    float 4.5s ease-in-out infinite;
  animation-delay: calc(0.5s + var(--d)), var(--d);
}
.sticker:hover { filter: brightness(1.06); }
.sticker.popped { animation: wiggle 0.6s ease; }
.s1 { top: 8%; left: 7%; --r: -10deg; }
.s2 { top: 10%; right: 9%; --r: 8deg; }
.s3 { bottom: 7%; left: 8%; --r: 6deg; }
.s4 { bottom: 6%; right: 10%; --r: -6deg; }
.s5 { top: 6%; left: 44%; --r: 12deg; display: none; }
.s6 { bottom: 5%; left: 42%; --r: -12deg; display: none; }
@media (min-width: 900px) {
  .sticker { width: 70px; height: 70px; font-size: 2rem; border-radius: 18px; }
  .s5, .s6 { display: inline-flex; }
  .s3 { bottom: 12%; left: 10%; }
  .s4 { bottom: 14%; right: 12%; }
  .logo { font-size: 3.7rem; }
}
@keyframes sticker-in {
  from { opacity: 0; transform: scale(0) rotate(0); }
  to { opacity: 1; transform: scale(1) rotate(var(--r)); }
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(var(--r)); }
  50% { transform: translateY(-10px) rotate(calc(var(--r) * -1)); }
}
@keyframes wiggle {
  0% { transform: scale(1) rotate(var(--r)); }
  25% { transform: scale(1.3) rotate(-18deg); }
  50% { transform: scale(1.15) rotate(16deg); }
  75% { transform: scale(1.2) rotate(-8deg); }
  100% { transform: scale(1) rotate(var(--r)); }
}

/* ---------- Card ---------- */
.auth-card {
  background: var(--gol-card);
  border-radius: 30px;
  box-shadow: 0 6px 0 var(--gol-card-edge);
  padding: 1.75rem 1.4rem;
  align-self: center;
  animation: card-up 0.6s 0.25s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}
@media (min-width: 576px) {
  .auth-card { padding: 2.5rem 2.5rem 2rem; }
}
@keyframes card-up {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
.auth-card.is-success .gol-title { animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop {
  0% { transform: scale(0.8); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.error-box {
  background: #ffe9e4;
  color: #b8412c;
  border-radius: 16px;
  padding: 0.65rem 0.9rem;
  font-weight: 700;
  font-size: 0.88rem;
  animation: shake 0.4s;
}
@keyframes shake {
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  background: #fff;
  color: #1f1f1f;
  border: 2px solid var(--gol-ink);
  border-radius: 999px;
  padding: 0.85rem 1rem;
  font-family: var(--gol-font);
  font-weight: 800;
  font-size: 1.05rem;
  box-shadow: 0 4px 0 var(--gol-ink);
  transition: transform 0.08s, box-shadow 0.08s, background 0.15s;
}
.google-btn:hover:not(:disabled) { background: var(--gol-purple-soft); }
.google-btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--gol-ink); }
.google-btn:focus-visible { outline: 3px solid rgba(107, 66, 227, 0.4); outline-offset: 3px; }
.google-btn:disabled { opacity: 0.85; }
.google-g { width: 22px; height: 22px; flex-shrink: 0; }
.ok-icon { color: #3aa655; font-size: 1.2rem; }

.perks { display: grid; gap: 0.6rem; }
.perk {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: var(--gol-bg);
  border-radius: 16px;
  padding: 0.6rem 0.8rem;
  animation: perk-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: calc(0.6s + var(--i) * 0.12s);
}
.perk-tile { width: 40px; height: 40px; font-size: 1.1rem; }
.perk-title { font-weight: 900; font-size: 0.95rem; }
.perk-text { font-weight: 600; font-size: 0.8rem; color: var(--gol-muted); }
@keyframes perk-in {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: none; }
}
.fine-print { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); }

/* Respect "reduce motion" in the phone / laptop settings */
@media (prefers-reduced-motion: reduce) {
  .logo-ch, .sticker, .blob, .auth-card, .perk, .error-box { animation: none !important; }
  .sticker { transform: rotate(var(--r)); }
  .idea-enter-active, .idea-leave-active { transition: none; }
}
</style>
