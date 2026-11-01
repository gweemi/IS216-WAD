<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithGoogle, friendlyError, isCancelled } from '@/services/auth'
import { burstFrom, celebrateCheckIn } from '@/utils/celebrate'
import { seedActivities } from '@/data/seedActivities' 

const route = useRoute()
const router = useRouter()

// Show a "Back" link only if the landing page route exists
const hasLanding = router.hasRoute('landing')

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

// ---------- Sections below the log-in screen (landing page content) ----------
const year = new Date().getFullYear()

const CATEGORIES = [
  { emoji: '🌿', label: 'Nature & trails', color: 'var(--gol-lime)' },
  { emoji: '🏸', label: 'Sports', color: 'var(--gol-coral)' },
  { emoji: '☕', label: 'Cafés & food', color: 'var(--gol-yellow)' },
  { emoji: '🎨', label: 'Arts & workshops', color: '#ffb8d1' },
  { emoji: '🎸', label: 'Gigs & events', color: 'var(--gol-cyan)' },
  { emoji: '🤝', label: 'Volunteering', color: '#d8f6f8' },
]

// Figures from our project proposal
const STATS = [
  { emoji: '📱', num: '33%', label: 'of NUS students spend 4+ hours a day on social media', color: 'var(--gol-cyan)' },
  { emoji: '😟', num: '2.4×', label: 'higher odds of anxiety and low mood for those students', color: 'var(--gol-coral)' },
  { emoji: '⏱️', num: '6.1h', label: 'average daily phone use among NUS undergrads', color: 'var(--gol-yellow)' },
  { emoji: '🚧', num: '3', label: 'big barriers: cost, time and no one to go with', color: 'var(--gol-lime)' },
]

const TABS = [
  { id: 'all', label: 'Top picks', emoji: '⭐' },
  { id: 'chill', label: 'Chill', emoji: '🧘' },
  { id: 'active', label: 'Get active', emoji: '⚡' },
  { id: 'free', label: 'Free', emoji: '💸' },
  { id: 'friends', label: 'Bring friends', emoji: '🙌' },
]
const FILTERS = {
  all: () => true,
  chill: (a) => a.energyLevel === 'low',
  active: (a) => a.energyLevel === 'high',
  free: (a) => !a.cost,
  friends: (a) => a.groupFriendly,
}
const activeTab = ref('all')
const shownActivities = computed(() => {
  if (activeTab.value === 'all') {
    // Top picks: one activity from each category, so the mix is varied
    const seen = new Set()
    return seedActivities.filter((a) => !seen.has(a.category) && seen.add(a.category)).slice(0, 6)
  }
  return seedActivities.filter(FILTERS[activeTab.value]).slice(0, 6)
})

const ENERGY_LABEL = { low: '🧘 Chill', medium: '🚶 Moderate', high: '⚡ Active' }
const CATEGORY_STYLE = {
  outdoors: { emoji: '🌳', color: 'var(--gol-lime)', blurb: 'Fresh air, greenery and a good walk.' },
  sports: { emoji: '🏀', color: 'var(--gol-coral)', blurb: 'Get moving and shake off exam stress.' },
  workshops: { emoji: '🏺', color: 'var(--gol-yellow)', blurb: 'Learn something new with your hands.' },
  arts: { emoji: '🎨', color: '#ffb8d1', blurb: 'Slow down with art and ideas.' },
  games: { emoji: '🎲', color: 'var(--gol-yellow)', blurb: 'Friendly competition, lots of laughs.' },
  food: { emoji: '🍜', color: 'var(--gol-coral)', blurb: 'Eat your way through somewhere new.' },
  volunteering: { emoji: '🤝', color: '#d8f6f8', blurb: 'Give back with a few hours of your time.' },
  wellness: { emoji: '🧘', color: '#d8f6f8', blurb: 'Slow down, stretch and breathe.' },
  events: { emoji: '🎸', color: 'var(--gol-cyan)', blurb: 'Something happening around the island.' },
}
function catStyle(a) {
  return CATEGORY_STYLE[a.category] || { emoji: '✨', color: 'var(--gol-purple-soft)', blurb: 'Something new to try.' }
}

const STEPS = [
  { emoji: '🎯', color: 'var(--gol-cyan)', title: 'Set your vibe', text: 'Pick your interests, budget and energy level, solo or with friends.' },
  { emoji: '📍', color: 'var(--gol-coral)', title: 'Pick and go', text: 'Choose an activity or join an OPENJIO!, then check in when you arrive.' },
  { emoji: '🏆', color: 'var(--gol-yellow)', title: 'Level up', text: 'Collect points and badges, keep your streak, and reflect on how it felt.' },
]

// "Get started" buttons further down scroll back up to the Google button
const googleBtn = ref(null)
function goToSignIn() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  setTimeout(() => googleBtn.value && googleBtn.value.focus({ preventScroll: true }), reduce ? 0 : 500)
}

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
  <div class="page">
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
        <RouterLink v-if="hasLanding" :to="{ name: 'landing' }" class="back-link">
          <i class="bi bi-arrow-left"></i> Back
        </RouterLink>
        <p class="gol-eyebrow mb-1">Let's go</p>
        <h2 class="gol-title mb-2" data-testid="auth-title">{{ success ? 'You’re in! 🎉' : 'Welcome in' }}</h2>
        <p class="muted mb-4">Log in or sign up with your Google account. It takes two taps.</p>

        <div v-if="error" class="error-box mb-3" role="alert" data-testid="auth-error">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error }}
        </div>

        <!-- White with the coloured G, as Google's sign-in guidelines ask -->
        <button
          type="button"
          ref="googleBtn"
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
    <!-- Scroll hint to the sections below -->
    <a href="#explore" class="scroll-hint">See what you can do <span aria-hidden="true">↓</span></a>
  </main>

  <!-- ===== Landing-page sections (layout inspired by DataCamp) ===== -->

  <!-- Activity-type strip -->
  <section id="explore" class="strip" aria-label="Kinds of activities">
    <div class="container d-flex flex-wrap justify-content-center gap-3">
      <span v-for="(c, i) in CATEGORIES" :key="c.label" class="strip-chip" :style="{ '--r': (i % 2 ? 2 : -2) + 'deg' }">
        <span class="tile tile-sm" :style="{ background: c.color }">{{ c.emoji }}</span>{{ c.label }}
      </span>
    </div>
  </section>

  <!-- Why GetOutLah? -->
  <section class="container section">
    <div class="card-lip why">
      <div class="row align-items-center g-5">
        <div class="col-12 col-lg-6">
          <p class="gol-eyebrow">Why GetOutLah?</p>
          <h2 class="section-title">Less scrolling.<br />More doing.</h2>
          <p class="muted">
            After exams there's suddenly lots of free time, but deciding what to do, finding something
            affordable and finding someone to go with all take effort. So it's easy to keep scrolling.
            GetOutLah! makes the first step easy.
          </p>
          <div class="d-flex flex-wrap gap-2 mt-3">
            <a v-for="t in TABS.slice(1)" :key="t.id" href="#activities" class="chip" @click="activeTab = t.id">
              {{ t.emoji }} {{ t.label }}
            </a>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="row g-3">
            <div v-for="(s, i) in STATS" :key="s.num" class="col-6">
              <div class="stat h-100" :style="{ background: s.color, '--r': (i % 2 ? 2 : -2) + 'deg' }">
                <span class="stat-emoji">{{ s.emoji }}</span>
                <div class="stat-num">{{ s.num }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            </div>
          </div>
          <p class="source">Sources: NUS Student Life and Wellness Survey 2025; Chen et al., 2026; Agans et al., 2023.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Activity catalogue: tabs + cards -->
  <section id="activities" class="container section">
    <p class="gol-eyebrow text-center">Pick your vibe</p>
    <h2 class="section-title text-center">Something for every mood</h2>
    <div class="d-flex flex-wrap justify-content-center gap-2 mb-4" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === t.id }"
        role="tab"
        :aria-selected="activeTab === t.id"
        @click="activeTab = t.id"
      >
        {{ t.emoji }} {{ t.label }}
      </button>
    </div>
    <TransitionGroup tag="div" name="card" class="row g-3">
      <div v-for="a in shownActivities" :key="a.id" class="col-12 col-md-6 col-lg-4">
        <article class="card-lip act h-100">
          <div class="d-flex align-items-center gap-3 mb-3">
            <span class="tile" :style="{ background: catStyle(a).color }">{{ catStyle(a).emoji }}</span>
            <h3 class="act-title">{{ a.title }}</h3>
          </div>
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pill" :class="'pill-' + a.energyLevel">{{ ENERGY_LABEL[a.energyLevel] }}</span>
            <span class="pill">⏱ {{ a.durationHrs }} hr</span>
            <span class="pill">{{ a.cost ? 'S$' + a.cost : 'Free' }}</span>
            <span v-if="a.slotsLeft === 0" class="pill pill-full">Full</span>
            <span v-else-if="a.slotsLeft" class="pill pill-jio">{{ a.slotsLeft }} slots left</span>
          </div>
          <p class="muted act-text">{{ catStyle(a).blurb }} 📍 {{ a.area }} · {{ a.setting }}</p>
          <button type="button" class="see-details" @click="goToSignIn">Log in to see details →</button>
        </article>
      </div>
    </TransitionGroup>
  </section>

  <!-- How it works -->
  <section class="container section">
    <p class="gol-eyebrow text-center">How it works</p>
    <h2 class="section-title text-center">Three steps to a better break</h2>
    <div class="row g-3">
      <div v-for="(s, i) in STEPS" :key="s.title" class="col-12 col-md-4">
        <div class="card-lip step h-100">
          <span class="tile tile-lg" :style="{ background: s.color, '--r': (i % 2 ? 5 : -5) + 'deg' }">{{ s.emoji }}</span>
          <p class="step-num">Step {{ i + 1 }}</p>
          <h3 class="act-title">{{ s.title }}</h3>
          <p class="muted mb-0">{{ s.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Final call to action -->
  <section class="container section">
    <div class="cta">
      <span class="blob blob-a" aria-hidden="true"></span>
      <span class="cta-emoji e1" aria-hidden="true">🎉</span>
      <span class="cta-emoji e2" aria-hidden="true">🌴</span>
      <h2 class="cta-title">Ready to get out?</h2>
      <p class="cta-sub">Your next activity is a few taps away.</p>
      <button type="button" class="btn-3d btn-lime" @click="goToSignIn">Get started for free</button>
    </div>
  </section>
  </div>
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
  padding: 2rem 1rem 4.5rem; /* room for the scroll hint */
  position: relative;
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
/* Soft dotted texture so the purple panel isn't flat */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1.5px, transparent 1.5px);
  background-size: 22px 22px;
  pointer-events: none;
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
    bounce 2.4s ease-in-out infinite;
  animation-delay: calc(0.5s + var(--d)), calc(1s + var(--d));
}
.sticker { transition: scale 0.15s ease, filter 0.15s; }
.sticker:hover { filter: brightness(1.06); scale: 1.12; }
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
/* Bouncing stickers: hop up, squash on landing, small second hop */
@keyframes bounce {
  0%, 100% { transform: translateY(0) rotate(var(--r)) scale(1, 1); }
  10% { transform: translateY(0) rotate(var(--r)) scale(1.1, 0.9); }
  35% { transform: translateY(-24px) rotate(calc(var(--r) * -1)) scale(0.95, 1.06); }
  55% { transform: translateY(0) rotate(var(--r)) scale(1.08, 0.93); }
  68% { transform: translateY(-7px) rotate(var(--r)) scale(1, 1); }
  80% { transform: translateY(0) rotate(var(--r)) scale(1, 1); }
}
/* Very small, slow version for "reduce motion" laptops */
@keyframes bounce-soft {
  0%, 100% { transform: translateY(0) rotate(var(--r)); }
  50% { transform: translateY(-5px) rotate(var(--r)); }
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
  transition: translate 0.1s, box-shadow 0.1s, background 0.15s;
}
/* Lifts a little on hover, presses down on click */
.google-btn:hover:not(:disabled) { background: var(--gol-purple-soft); translate: 0 -2px; box-shadow: 0 6px 0 var(--gol-ink); }
.google-btn:active:not(:disabled) { translate: 0 3px; box-shadow: 0 1px 0 var(--gol-ink); }
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
  transition: translate 0.15s ease, background 0.15s;
}
/* Rows nudge right on hover */
.perk:hover { translate: 4px 0; background: var(--gol-purple-soft); }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1rem;
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--gol-muted);
  text-decoration: none;
}
.back-link:hover { color: var(--gol-purple); }
.perk-tile { width: 40px; height: 40px; font-size: 1.1rem; }
.perk-title { font-weight: 900; font-size: 0.95rem; }
.perk-text { font-weight: 600; font-size: 0.8rem; color: var(--gol-muted); }
@keyframes perk-in {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: none; }
}
.fine-print { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); }

/* =========================================================
   Landing-page sections below the log-in screen
   ========================================================= */
.page { background: var(--gol-bg); font-family: var(--gol-font); color: var(--gol-ink); overflow-x: hidden; }
.page a { text-decoration: none; color: inherit; }
#explore, #activities { scroll-margin-top: 16px; }
.section { padding-top: 2.5rem; padding-bottom: 2.5rem; }
.section-title { font-weight: 900; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; margin-bottom: 1.5rem; }
.mt-3 { margin-top: 1rem; }

/* "See what you can do ↓" at the bottom of the first screen */
.scroll-hint {
  position: absolute; left: 50%; bottom: 1.1rem; translate: -50% 0;
  font-weight: 800; font-size: 0.9rem; color: var(--gol-purple) !important;
  background: #fff; border-radius: 999px; padding: 0.35rem 1rem; box-shadow: 0 3px 0 var(--gol-card-edge);
  animation: hint-bob 1.8s ease-in-out infinite;
}
@keyframes hint-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

/* White card with the lavender "lip" (same as the log-in card) */
.card-lip { background: #fff; border-radius: 26px; box-shadow: 0 6px 0 var(--gol-card-edge); }

/* Emoji tile with the hard ink shadow */
.tile {
  --r: 0deg; /* tilt; some tiles set their own */
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 46px; height: 46px; border-radius: 13px; font-size: 1.4rem;
  border: 2px solid var(--gol-ink); box-shadow: 3px 3px 0 var(--gol-ink);
  transform: rotate(var(--r));
}
.tile-sm { width: 34px; height: 34px; font-size: 1.05rem; border-radius: 10px; box-shadow: 2px 2px 0 var(--gol-ink); }
.tile-lg { width: 64px; height: 64px; font-size: 2rem; border-radius: 18px; box-shadow: 4px 4px 0 var(--gol-ink); margin-bottom: 1rem; }

/* 3D button */
.btn-3d {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-family: var(--gol-font); font-weight: 900; font-size: 1.02rem; color: var(--gol-ink);
  border: 2px solid var(--gol-ink); border-radius: 999px; padding: 0.8rem 1.7rem;
  box-shadow: 0 4px 0 var(--gol-ink); transition: translate 0.1s, box-shadow 0.1s;
}
.btn-3d:hover { translate: 0 -2px; box-shadow: 0 6px 0 var(--gol-ink); }
.btn-3d:active { translate: 0 3px; box-shadow: 0 1px 0 var(--gol-ink); }
.btn-lime { background: var(--gol-lime); }
.link-btn { background: none; border: none; padding: 0; font: inherit; color: inherit; }

/* Activity-type strip */
.strip { padding: 2rem 0 1rem; }
.strip-chip {
  display: inline-flex; align-items: center; gap: 0.6rem; background: #fff; font-weight: 900;
  border: 2px solid var(--gol-ink); border-radius: 999px; padding: 0.4rem 1.1rem 0.4rem 0.45rem;
  box-shadow: 3px 3px 0 var(--gol-ink); transform: rotate(var(--r)); transition: transform 0.2s;
}
.strip-chip:hover { transform: rotate(0) scale(1.05); }

/* Why GetOutLah? */
.why { padding: 2.2rem 1.6rem; }
@media (min-width: 992px) { .why { padding: 3.2rem; } }
.chip { display: inline-flex; align-items: center; gap: 0.3rem; background: var(--gol-purple-soft); color: var(--gol-purple) !important; font-weight: 800; border-radius: 999px; padding: 0.5rem 1rem; }
.chip:hover { background: var(--gol-purple); color: #fff !important; }
.stat {
  border: 2px solid var(--gol-ink); border-radius: 20px; padding: 1.2rem; box-shadow: 4px 4px 0 var(--gol-ink);
  transform: rotate(var(--r)); transition: transform 0.2s;
}
.stat:hover { transform: rotate(0) translateY(-3px); }
.stat-emoji { font-size: 1.6rem; }
.stat-num { font-weight: 900; font-size: clamp(2rem, 5vw, 2.6rem); line-height: 1; margin-top: 0.3rem; }
.stat-label { font-weight: 700; font-size: 0.85rem; margin-top: 0.4rem; }
.source { font-size: 0.72rem; color: var(--gol-muted); margin: 1rem 0 0; }

/* Activity catalogue */
.tab {
  font-family: var(--gol-font); font-weight: 900; color: var(--gol-ink); background: #fff;
  border: 2px solid var(--gol-ink); border-radius: 999px; padding: 0.5rem 1.15rem; box-shadow: 0 3px 0 var(--gol-ink);
  transition: translate 0.1s, box-shadow 0.1s;
}
.tab:hover { translate: 0 -2px; box-shadow: 0 5px 0 var(--gol-ink); }
.tab.active { background: var(--gol-purple); color: #fff; translate: 0 2px; box-shadow: 0 1px 0 var(--gol-ink); }
.act { display: flex; flex-direction: column; padding: 1.4rem; transition: translate 0.15s; }
.act:hover { translate: 0 -4px; }
.act-title { font-weight: 900; font-size: 1.15rem; line-height: 1.25; margin: 0; }
.act-text { flex-grow: 1; font-size: 0.92rem; }
.pill { font-size: 0.75rem; font-weight: 800; border-radius: 999px; padding: 0.2rem 0.65rem; background: var(--gol-bg); }
.pill-low { background: #d8f6f8; }
.pill-medium { background: #effbd9; }
.pill-high { background: #ffe1da; }
.pill-full { background: var(--gol-locked); color: var(--gol-muted); }
.pill-jio { background: var(--gol-yellow); }
.see-details { align-self: flex-end; background: none; border: none; padding: 0; font-family: var(--gol-font); font-weight: 900; color: var(--gol-purple); }
.card-enter-active, .card-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.card-enter-from, .card-leave-to { opacity: 0; transform: translateY(10px) scale(0.98); }
.card-leave-active { position: absolute; visibility: hidden; }

/* How it works */
.step { padding: 1.6rem; }
.step-num { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gol-muted); margin-bottom: 0.2rem; }

/* Final call to action */
.cta {
  position: relative; overflow: hidden; text-align: center; color: #fff; border-radius: 30px; padding: 3.5rem 1.25rem;
  background: linear-gradient(150deg, var(--gol-purple) 0%, var(--gol-purple-dark) 100%); box-shadow: 0 6px 0 #2f1785;
}
.cta > * { position: relative; }
.cta .blob-a { position: absolute; }
.cta-title { font-weight: 900; font-size: clamp(2rem, 5vw, 2.8rem); }
.cta-sub { font-weight: 700; opacity: 0.9; margin-bottom: 1.5rem; }
.cta-emoji { position: absolute !important; font-size: 2.6rem; animation: bounce 2.4s ease-in-out infinite; }
.e1 { top: 14%; left: 8%; --r: -10deg; }
.e2 { top: 18%; right: 10%; --r: 8deg; animation-delay: 1s; }

.footer { padding-top: 1.5rem; padding-bottom: 2.5rem; font-weight: 700; font-size: 0.85rem; color: var(--gol-muted); }
.foot-logo { font-weight: 900; color: var(--gol-purple); }

/* Emoji tiles bounce when you hover their card */
.act:hover .tile, .step:hover .tile, .strip-chip:hover .tile { animation: bounce 0.8s ease-in-out; }

@media (prefers-reduced-motion: reduce) {
  .scroll-hint { animation: none; }
  .cta-emoji { animation: bounce-soft 3s ease-in-out infinite; }
  .act:hover .tile, .step:hover .tile, .strip-chip:hover .tile { animation: bounce-soft 0.8s ease-in-out; }
}

/* Devices with "reduce motion" / animations off: no bouncing, floating or
   spinning, but things still fade in gently so the page doesn't feel dead. */
@media (prefers-reduced-motion: reduce) {
  .logo-ch { animation: soft-in 0.6s ease both; animation-delay: calc(var(--i) * 50ms); }
  .sticker { transform: rotate(var(--r)); animation: soft-in 0.6s ease both, bounce-soft 3s ease-in-out infinite; animation-delay: calc(0.3s + var(--d)), var(--d); }
  .sticker.popped { animation: glow 0.6s ease; }
  .auth-card { animation: soft-in 0.6s 0.2s ease both; }
  .perk { animation: soft-in 0.5s ease both; animation-delay: calc(0.5s + var(--i) * 0.12s); }
  .blob, .error-box { animation: none; }
  .idea-enter-from, .idea-leave-to { transform: none; }
}
@keyframes soft-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes glow {
  50% { box-shadow: 4px 4px 0 var(--gol-ink), 0 0 0 8px rgba(255, 255, 255, 0.55); }
}
</style>
