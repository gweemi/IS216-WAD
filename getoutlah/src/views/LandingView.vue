<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { INTERESTS, getInterest } from '@/config/preferences'
import { seedActivities } from '@/data/seedActivities'
import LandingCategoryChip from '@/components/landing/LandingCategoryChip.vue'
import LandingActivityPreview from '@/components/landing/LandingActivityPreview.vue'
import AnimatedBrandHero from '@/components/landing/AnimatedBrandHero.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'

const router = useRouter()
const activeTab = ref('all')
const TABS = [{ id: 'all', label: 'Top picks', emoji: '⭐' }, { id: 'chill', label: 'Chill', emoji: '🧘' }, { id: 'active', label: 'Get active', emoji: '⚡' }, { id: 'free', label: 'Free', emoji: '💸' }, { id: 'friends', label: 'Bring friends', emoji: '🙌' }]
const FILTERS = { all: () => true, chill: (a) => a.energyLevel === 'low', active: (a) => a.energyLevel === 'high', free: (a) => !a.cost, friends: (a) => a.groupFriendly }
const BLURBS = { outdoors: 'Fresh air, greenery and a good walk.', sports: 'Get moving and shake off exam stress.', workshops: 'Learn something new with your hands.', arts: 'Slow down with art and ideas.', games: 'Friendly competition, lots of laughs.', food: 'Eat your way through somewhere new.', volunteering: 'Give back with a few hours of your time.', wellness: 'Slow down, stretch and breathe.', events: 'Something happening around the island.' }
const shownActivities = computed(() => {
  if (activeTab.value !== 'all') return seedActivities.filter(FILTERS[activeTab.value]).slice(0, 6)
  const seen = new Set()
  return seedActivities.filter((a) => !seen.has(a.category) && seen.add(a.category)).slice(0, 6)
})
const goToLogin = () => router.push({ name: 'login' })
const categoryBlurb = (activity) => BLURBS[activity.category] ?? `Try ${getInterest(activity.category)?.label ?? 'something new'}.`
const STATS = [
  { emoji: '📱', num: '33%', label: 'of NUS students spend 4+ hours a day on social media', color: 'var(--gol-cyan)' },
  { emoji: '😟', num: '2.4×', label: 'higher odds of anxiety and low mood for those students', color: 'var(--gol-coral)' },
  { emoji: '⏱️', num: '6.1h', label: 'average daily phone use among NUS undergrads', color: 'var(--gol-yellow)' },
  { emoji: '🚧', num: '3', label: 'big barriers: cost, time and no one to go with', color: 'var(--gol-lime)' },
]
const STEPS = [
  { emoji: '🎯', color: 'var(--gol-cyan)', title: 'Set your vibe', text: 'Pick your interests, budget and energy level, solo or with friends.' },
  { emoji: '📍', color: 'var(--gol-coral)', title: 'Pick and go', text: 'Choose an activity or join an OPENJIO!, then check in when you arrive.' },
  { emoji: '🏆', color: 'var(--gol-yellow)', title: 'Level up', text: 'Collect points and badges, keep your streak, and reflect on how it felt.' },
]
</script>

<template>
  <main class="page">
    <section class="hero-wrap"><AnimatedBrandHero variant="full" /></section>
    <a href="#explore" class="scroll-hint">See what you can do <span aria-hidden="true">↓</span></a>
    <section id="explore" class="strip" aria-label="Kinds of activities">
      <div class="container d-flex flex-wrap justify-content-center gap-3">
        <LandingCategoryChip v-for="(category, index) in INTERESTS" :key="category.id" :category="category" :index="index" />
      </div>
    </section>

    <section class="container section">
      <div class="card-lip why"><div class="row align-items-center g-5">
        <div class="col-12 col-lg-6"><p class="gol-eyebrow">Why GetOutLah?</p><h1 class="section-title">Less scrolling.<br>More doing.</h1><p class="muted">After exams there’s suddenly lots of free time, but deciding what to do, finding something affordable and finding someone to go with all take effort. GetOutLah! makes the first step easy.</p><div class="d-flex flex-wrap gap-2 mt-3"><a v-for="tab in TABS.slice(1)" :key="tab.id" href="#activities" class="chip" @click="activeTab = tab.id">{{ tab.emoji }} {{ tab.label }}</a></div></div>
        <div class="col-12 col-lg-6"><div class="row g-3"><div v-for="(stat, index) in STATS" :key="stat.num" class="col-6"><div class="stat h-100" :style="{ background: stat.color, '--r': (index % 2 ? 2 : -2) + 'deg' }"><span class="stat-emoji">{{ stat.emoji }}</span><div class="stat-num">{{ stat.num }}</div><div class="stat-label">{{ stat.label }}</div></div></div></div><p class="source">Sources: NUS Student Life and Wellness Survey 2025; Chen et al., 2026; Agans et al., 2023.</p></div>
      </div></div>
    </section>

    <section id="activities" class="container section"><p class="gol-eyebrow text-center">Pick your vibe</p><h2 class="section-title text-center">Something for every mood</h2><div class="d-flex flex-wrap justify-content-center gap-2 mb-4" role="tablist"><button v-for="tab in TABS" :key="tab.id" type="button" class="tab" :class="{ active: activeTab === tab.id }" role="tab" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id">{{ tab.emoji }} {{ tab.label }}</button></div><TransitionGroup tag="div" name="card" class="row g-3"><div v-for="activity in shownActivities" :key="activity.id" class="col-12 col-md-6 col-lg-4"><LandingActivityPreview :activity="activity" :blurb="categoryBlurb(activity)" @login="goToLogin" /></div></TransitionGroup></section>

    <section class="container section"><p class="gol-eyebrow text-center">How it works</p><h2 class="section-title text-center">Three steps to a better break</h2><div class="row g-3"><div v-for="(step, index) in STEPS" :key="step.title" class="col-12 col-md-4"><div class="card-lip step h-100"><span class="tile tile-lg" :style="{ background: step.color, '--r': (index % 2 ? 5 : -5) + 'deg' }">{{ step.emoji }}</span><p class="step-num">Step {{ index + 1 }}</p><h3 class="act-title">{{ step.title }}</h3><p class="muted mb-0">{{ step.text }}</p></div></div></div></section>

    <section class="container section"><div class="cta"><span class="blob blob-a" aria-hidden="true"></span><span class="cta-emoji e1" aria-hidden="true">🎉</span><span class="cta-emoji e2" aria-hidden="true">🌴</span><h2 class="cta-title">Ready to get out?</h2><p class="cta-sub">Your next activity is a few taps away.</p><button type="button" class="btn-3d btn-lime cta-button" @click="goToLogin">Get Out for Free</button></div></section>
    <LandingFooter />
  </main>
</template>

<style scoped>
.page { min-height: 100vh; background: var(--gol-bg); color: var(--gol-ink); font-family: var(--gol-font); overflow-x: hidden; }.page a { text-decoration: none; color: inherit; }.hero-wrap { width: min(100% - 2rem, 1280px); margin: 2rem auto 0; }.scroll-hint { display: flex; width: fit-content; align-items: center; gap: .35rem; margin: .9rem auto 1.3rem; padding: .35rem 1rem; background: #fff; border-radius: 999px; box-shadow: 0 3px 0 var(--gol-card-edge); color: var(--gol-purple) !important; font-size: .9rem; font-weight: 800; animation: hint-bob 1.8s ease-in-out infinite; }.section { padding: 2.5rem 0; }.strip { padding: 2rem 0 1rem; }.section-title { font-weight: 900; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; margin-bottom: 1.5rem; }.muted { color: var(--gol-muted); font-weight: 600; }.card-lip { background: #fff; border-radius: 26px; box-shadow: 0 6px 0 var(--gol-card-edge); }.why { padding: 2.2rem 1.6rem; } @media (min-width: 992px) { .why { padding: 3.2rem; } }.chip { display: inline-flex; align-items: center; gap: .3rem; background: var(--gol-purple-soft); color: var(--gol-purple) !important; font-weight: 800; border-radius: 999px; padding: .5rem 1rem; }.chip:hover { background: var(--gol-purple); color: #fff !important; }.stat { border: 2px solid var(--gol-ink); border-radius: 20px; padding: 1.2rem; box-shadow: 4px 4px 0 var(--gol-ink); transform: rotate(var(--r)); transition: transform .2s; }.stat:hover { transform: rotate(0) translateY(-3px); }.stat-emoji { font-size: 1.6rem; }.stat-num { font-weight: 900; font-size: clamp(2rem, 5vw, 2.6rem); line-height: 1; margin-top: .3rem; }.stat-label { font-weight: 700; font-size: .85rem; margin-top: .4rem; }.source { font-size: .72rem; color: var(--gol-muted); margin: 1rem 0 0; }.tab { font-family: var(--gol-font); font-weight: 900; color: var(--gol-ink); background: #fff; border: 2px solid var(--gol-ink); border-radius: 999px; padding: .5rem 1.15rem; box-shadow: 0 3px 0 var(--gol-ink); transition: translate .1s, box-shadow .1s; }.tab:hover { translate: 0 -2px; box-shadow: 0 5px 0 var(--gol-ink); }.tab.active { background: var(--gol-purple); color: #fff; translate: 0 2px; box-shadow: 0 1px 0 var(--gol-ink); }.tile { display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--gol-ink); box-shadow: 3px 3px 0 var(--gol-ink); }.tile-lg { width: 64px; height: 64px; border-radius: 18px; font-size: 2rem; margin-bottom: 1rem; transform: rotate(var(--r)); }.step { padding: 1.6rem; }.step-num { font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--gol-muted); margin-bottom: .2rem; }.act-title { font-weight: 900; font-size: 1.15rem; line-height: 1.25; margin: 0; }.cta { position: relative; overflow: hidden; text-align: center; color: #fff; border-radius: 30px; padding: 3.5rem 1.25rem; background: linear-gradient(150deg, var(--gol-purple), var(--gol-purple-dark)); box-shadow: 0 6px 0 #2f1785; }.cta > * { position: relative; }.blob { position: absolute; border-radius: 46% 54% 60% 40%; }.blob-a { width: 220px; height: 220px; right: -80px; bottom: -90px; background: var(--gol-coral); opacity: .9; animation: spin 18s linear infinite; }.cta-title { font-weight: 900; font-size: clamp(2rem, 5vw, 2.8rem); }.cta-sub { font-weight: 700; opacity: .9; margin-bottom: 1.5rem; }.cta-emoji { position: absolute !important; font-size: 2.6rem; animation: bounce 2.4s ease-in-out infinite; }.e1 { top: 14%; left: 8%; }.e2 { top: 18%; right: 10%; animation-delay: 1s; }.btn-3d { font-family: var(--gol-font); font-weight: 900; font-size: 1.02rem; color: var(--gol-ink); border: 2px solid var(--gol-ink); border-radius: 999px; padding: .8rem 1.7rem; box-shadow: 0 4px 0 var(--gol-ink); transition: translate .1s, box-shadow .1s; }.btn-3d:hover { translate: 0 -2px; box-shadow: 0 6px 0 var(--gol-ink); }.btn-lime { background: var(--gol-lime); }.cta-button { animation: cta-bounce 1.65s ease-in-out infinite; }.card-enter-active,.card-leave-active { transition: opacity .25s ease, transform .25s ease; }.card-enter-from,.card-leave-to { opacity: 0; transform: translateY(10px) scale(.98); }.card-leave-active { position: absolute; visibility: hidden; }@keyframes spin { to { transform: rotate(360deg); } }@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px) rotate(8deg); } }@keyframes hint-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(5px); } }@keyframes cta-bounce { 0%,100% { transform: translateY(0); } 18% { transform: translateY(-14px); } 36% { transform: translateY(0); } 54% { transform: translateY(-7px); } 70% { transform: translateY(0); } }@media (prefers-reduced-motion: reduce) { .blob-a,.cta-emoji,.scroll-hint,.cta-button { animation: none; } }
</style>
