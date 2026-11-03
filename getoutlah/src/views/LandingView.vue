<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { INTERESTS, getInterest } from '@/config/preferences'
import { seedActivities } from '@/data/seedActivities'
import LandingCategoryChip from '@/components/landing/LandingCategoryChip.vue'
import AnimatedBrandHero from '@/components/landing/AnimatedBrandHero.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingActivityPreview from '@/components/landing/LandingActivityPreview.vue'

const router = useRouter()
const activeTab = ref('all')
const TABS = [{ id: 'all', label: 'Top picks', emoji: '⭐' }, { id: 'chill', label: 'Chill', emoji: '🧘' }, { id: 'active', label: 'Get active', emoji: '⚡' }, { id: 'free', label: 'Free', emoji: '💸' }, { id: 'friends', label: 'Bring friends', emoji: '🙌' }]
const FILTERS = { all: () => true, chill: (a) => a.energyLevel === 'low', active: (a) => a.energyLevel === 'high', free: (a) => !a.cost, friends: (a) => a.groupFriendly }
const BLURBS = { outdoors: 'Fresh air, greenery and a good walk.', sports: 'Get moving and shake off exam stress.', workshops: 'Learn something new with your hands.', arts: 'Slow down with art and ideas.', games: 'Friendly competition, lots of laughs.', food: 'Eat your way through somewhere new.', volunteering: 'Give back with a few hours of your time.', wellness: 'Slow down, stretch and breathe.', events: 'Something happening around the island.' }

const shownActivities = computed(() => {
  if (activeTab.value !== 'all') return seedActivities.filter(FILTERS[activeTab.value]).slice(0, 9)
  const seen = new Set()
  return seedActivities.filter((a) => !seen.has(a.category) && seen.add(a.category)).slice(0, 9)
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

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const vReveal = {
  mounted(el, binding) {
    el.classList.add('reveal')
    el.style.setProperty('--reveal-delay', `${binding.value || 0}ms`)
    if (!('IntersectionObserver' in window)) { el.classList.add('is-visible'); return }
    el._io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        el.classList.add('is-visible')
        el.dispatchEvent(new CustomEvent('revealed'))
        el._io.disconnect()
      }
    }, { threshold: 0.15 })
    el._io.observe(el)
  },
  unmounted(el) { el._io?.disconnect() },
}

const vTilt = {
  mounted(el) {
    el.classList.add('tilt') // only moves when you hover, so it stays on for reduce-motion too
    el._move = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.setProperty('--ry', `${x * 10}deg`)
      el.style.setProperty('--rx', `${-y * 10}deg`)
    }
    el._leave = () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg') }
    el.addEventListener('pointermove', el._move)
    el.addEventListener('pointerleave', el._leave)
  },
  unmounted(el) { el.removeEventListener('pointermove', el._move); el.removeEventListener('pointerleave', el._leave) },
}

const statText = ref(STATS.map((s) => s.num.replace(/[\d.]+/, '0')))
let counted = false
const countUp = () => {
  if (counted) return
  counted = true
  const t0 = performance.now(), dur = reduceMotion ? 600 : 1400
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3)
    statText.value = STATS.map((s) => {
      const target = parseFloat(s.num), decimals = (s.num.split('.')[1] || '').replace(/\D/g, '').length
      return s.num.replace(/[\d.]+/, (target * e).toFixed(decimals))
    })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
const ticker = computed(() => seedActivities.slice(0, 14).map((a) => ({ id: a.id, title: a.title, emoji: getInterest(a.category)?.emoji ?? '✨' })))

const SLIDE_MS = 3500
const slide = ref(0)
const perView = ref(3)
const carouselPaused = ref(false)
let slideTimer = null
let swipeX = null
const maxSlide = computed(() => Math.max(0, shownActivities.value.length - perView.value))
const slidePages = computed(() => Array.from({ length: maxSlide.value + 1 }, (_, i) => i))
const trackStyle = computed(() => ({ transform: `translateX(-${slide.value * (100 / perView.value)}%)` }))
const slideStyle = computed(() => ({ flex: `0 0 ${100 / perView.value}%` }))
const updatePerView = () => {
  const w = window.innerWidth
  perView.value = w < 768 ? 1 : w < 992 ? 2 : 3 // 1 card on phones, 2 on tablets, 3 on laptops
  if (slide.value > maxSlide.value) slide.value = maxSlide.value
}
const nextSlide = () => { slide.value = slide.value >= maxSlide.value ? 0 : slide.value + 1 }
const prevSlide = () => { slide.value = slide.value <= 0 ? maxSlide.value : slide.value - 1 }
const startSlides = () => {
  clearInterval(slideTimer)
  slideTimer = setInterval(() => { if (!carouselPaused.value && !document.hidden && maxSlide.value > 0) nextSlide() }, SLIDE_MS)
}
const goToSlide = (i) => { slide.value = i; startSlides() }
const onSwipeStart = (e) => { swipeX = e.clientX }
const onSwipeEnd = (e) => {
  if (swipeX === null) return
  const dx = e.clientX - swipeX
  swipeX = null
  if (Math.abs(dx) > 50) { dx < 0 ? nextSlide() : prevSlide(); startSlides() }
}
watch(activeTab, () => { slide.value = 0; startSlides() }) // new tab -> back to first card
onMounted(() => { updatePerView(); window.addEventListener('resize', updatePerView); startSlides() })
onBeforeUnmount(() => { clearInterval(slideTimer); window.removeEventListener('resize', updatePerView) })

const progress = ref(0)
let raf = null
const onScroll = () => {
  if (raf) return
  raf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    progress.value = max > 0 ? window.scrollY / max : 0
    raf = null
  })
}
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const burst = ref([])
const EMOJIS = ['🎉', '✨', '🌴', '🎈', '⭐', '🥳']
const celebrateThenLogin = () => {
  burst.value = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2
    const dist = 120 + Math.random() * 90
    return { id: `${Date.now()}-${i}`, emoji: EMOJIS[i % EMOJIS.length], x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 40 }
  })
  setTimeout(goToLogin, 650)
}
</script>

<template>
  <main class="page">
    
    <div class="progress-bar" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true"></div>

    <section class="hero-wrap"><AnimatedBrandHero variant="full" /></section>
    <a href="#explore" class="scroll-hint">See what you can do <span aria-hidden="true">↓</span></a>

    
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track">
        <span v-for="(item, i) in [...ticker, ...ticker]" :key="item.id + '-' + i" class="ticker-item">{{ item.emoji }} {{ item.title }}</span>
      </div>
    </div>

    <section id="explore" class="strip" aria-label="Kinds of activities">
      <div class="container d-flex flex-wrap justify-content-center gap-3">
        
        <div v-for="(category, index) in INTERESTS" :key="category.id" v-reveal="index * 60" class="chip-pop">
          <LandingCategoryChip :category="category" :index="index" />
        </div>
      </div>
    </section>

    <section class="container section">
      <div v-reveal class="card-lip why">
        
        <span class="float-emoji f1" aria-hidden="true">📱</span>
        <span class="float-emoji f2" aria-hidden="true">🌳</span>
        <span class="float-emoji f3" aria-hidden="true">🎨</span>
        <div class="row align-items-center g-5">
          <div class="col-12 col-lg-6">
            <p class="gol-eyebrow">Why GetOutLah?</p>
            
            <h1 class="section-title">Less <span v-reveal="400" class="strike">scrolling</span>.<br>More <span class="wiggle-word">doing</span>.</h1>
            <p class="muted">After exams there’s suddenly lots of free time, but deciding what to do, finding something affordable and finding someone to go with all take effort. GetOutLah! makes the first step easy.</p>
            <div class="d-flex flex-wrap gap-2 mt-3"><a v-for="tab in TABS.slice(1)" :key="tab.id" href="#activities" class="chip" @click="activeTab = tab.id">{{ tab.emoji }} {{ tab.label }}</a></div>
          </div>
          <div class="col-12 col-lg-6">
            
            <div class="row g-3" @revealed="countUp" v-reveal>
              <div v-for="(stat, index) in STATS" :key="stat.num" v-reveal="index * 120" class="col-6 pop-in">
                <div v-tilt class="stat h-100" :style="{ background: stat.color, '--r': (index % 2 ? 2 : -2) + 'deg' }">
                  <span class="stat-emoji">{{ stat.emoji }}</span>
                  <div class="stat-num">{{ statText[index] }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
              </div>
            </div>
            <p class="source">Sources: NUS Student Life and Wellness Survey 2025; Chen et al., 2026; Agans et al., 2023.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="activities" class="container section">
      <p v-reveal class="gol-eyebrow text-center">Pick your vibe</p>
      <h2 v-reveal="100" class="section-title text-center">Something for every mood</h2>
      <div class="d-flex flex-wrap justify-content-center gap-2 mb-4" role="tablist">
        <button v-for="tab in TABS" :key="tab.id" type="button" class="tab" :class="{ active: activeTab === tab.id }" role="tab" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id">{{ tab.emoji }} {{ tab.label }}</button>
      </div>
      
      <div v-reveal="150">
        <Transition name="swap" mode="out-in">
          <div
            :key="activeTab"
            class="gol-carousel"
            :class="{ paused: carouselPaused }"
            @mouseenter="carouselPaused = true"
            @mouseleave="carouselPaused = false"
            @focusin="carouselPaused = true"
            @focusout="carouselPaused = false"
            @pointerdown="onSwipeStart"
            @pointerup="onSwipeEnd"
          >
            <div v-if="!shownActivities.length" class="empty">Nothing here yet. Try another vibe ✨</div>
            <template v-else>
              <div class="viewport">
                <div class="track" :style="trackStyle">
                  <div v-for="(activity, i) in shownActivities" :key="activity.id" class="slide" :style="slideStyle" :class="{ 'in-view': i >= slide && i < slide + perView }">
                    <LandingActivityPreview :activity="activity" :blurb="categoryBlurb(activity)" @login="goToLogin" />
                  </div>
                </div>
              </div>
              <template v-if="maxSlide > 0">
                <button type="button" class="nav-btn prev" aria-label="Previous" @click="prevSlide(); startSlides()">‹</button>
                <button type="button" class="nav-btn next" aria-label="Next" @click="nextSlide(); startSlides()">›</button>
                <div class="dots" aria-label="Choose slide">
                  <button v-for="p in slidePages" :key="p" type="button" class="dot" :class="{ active: p === slide }" :aria-label="`Slide ${p + 1}`" @click="goToSlide(p)">
                    <!-- the active dot fills up like a timer -->
                    <span v-if="p === slide" :key="slide" class="fill" :style="{ animationDuration: SLIDE_MS + 'ms' }"></span>
                  </button>
                </div>
              </template>
            </template>
          </div>
        </Transition>
      </div>
    </section>

    <section class="container section">
      <p v-reveal class="gol-eyebrow text-center">How it works</p>
      <h2 v-reveal="100" class="section-title text-center">Three steps to a better break</h2>
      <div class="row g-3 steps">
        
        <div v-for="(step, index) in STEPS" :key="step.title" v-reveal="index * 180" class="col-12 col-md-4">
          <div v-tilt class="card-lip step h-100">
            <span class="tile tile-lg" :style="{ background: step.color, '--r': (index % 2 ? 5 : -5) + 'deg' }">{{ step.emoji }}</span>
            <p class="step-num">Step {{ index + 1 }}</p>
            <h3 class="act-title">{{ step.title }}</h3>
            <p class="muted mb-0">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="container section">
      <div v-reveal class="cta">
        <span class="blob blob-a" aria-hidden="true"></span>
        <span class="blob blob-b" aria-hidden="true"></span>
        <span class="cta-emoji e1" aria-hidden="true">🎉</span>
        <span class="cta-emoji e2" aria-hidden="true">🌴</span>
        <span class="cta-emoji e3" aria-hidden="true">🛼</span>
        <h2 class="cta-title">Ready to get out?</h2>
        <p class="cta-sub">Your next activity is a few taps away.</p>
        
        <div class="burst-wrap">
          <button type="button" class="btn-3d btn-lime cta-button" @click="celebrateThenLogin">Get Out for Free</button>
          <span v-for="b in burst" :key="b.id" class="burst" :style="{ '--x': b.x + 'px', '--y': b.y + 'px' }" aria-hidden="true">{{ b.emoji }}</span>
        </div>
      </div>
    </section>
    <LandingFooter />
  </main>
</template>

<style scoped>
.page { min-height: 100vh; background: var(--gol-bg); color: var(--gol-ink); font-family: var(--gol-font); overflow-x: hidden; }.page a { text-decoration: none; color: inherit; }.hero-wrap { width: min(100% - 2rem, 1280px); margin: 2rem auto 0; }.scroll-hint { display: flex; width: fit-content; align-items: center; gap: .35rem; margin: .9rem auto 1.3rem; padding: .35rem 1rem; background: #fff; border-radius: 999px; box-shadow: 0 3px 0 var(--gol-card-edge); color: var(--gol-purple) !important; font-size: .9rem; font-weight: 800; animation: hint-bob 1.8s ease-in-out infinite; }.section { padding: 2.5rem 0; }.strip { padding: 2rem 0 1rem; }.section-title { font-weight: 900; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; margin-bottom: 1.5rem; }.muted { color: var(--gol-muted); font-weight: 600; }.card-lip { background: #fff; border-radius: 26px; box-shadow: 0 6px 0 var(--gol-card-edge); }.why { padding: 2.2rem 1.6rem; } @media (min-width: 992px) { .why { padding: 3.2rem; } }.chip { display: inline-flex; align-items: center; gap: .3rem; background: var(--gol-purple-soft); color: var(--gol-purple) !important; font-weight: 800; border-radius: 999px; padding: .5rem 1rem; }.chip:hover { background: var(--gol-purple); color: #fff !important; }.stat { border: 2px solid var(--gol-ink); border-radius: 20px; padding: 1.2rem; box-shadow: 4px 4px 0 var(--gol-ink); transform: rotate(var(--r)); transition: transform .2s; }.stat:hover { transform: rotate(0) translateY(-3px); }.stat-emoji { font-size: 1.6rem; }.stat-num { font-weight: 900; font-size: clamp(2rem, 5vw, 2.6rem); line-height: 1; margin-top: .3rem; }.stat-label { font-weight: 700; font-size: .85rem; margin-top: .4rem; }.source { font-size: .72rem; color: var(--gol-muted); margin: 1rem 0 0; }.tab { font-family: var(--gol-font); font-weight: 900; color: var(--gol-ink); background: #fff; border: 2px solid var(--gol-ink); border-radius: 999px; padding: .5rem 1.15rem; box-shadow: 0 3px 0 var(--gol-ink); transition: translate .1s, box-shadow .1s; }.tab:hover { translate: 0 -2px; box-shadow: 0 5px 0 var(--gol-ink); }.tab.active { background: var(--gol-purple); color: #fff; translate: 0 2px; box-shadow: 0 1px 0 var(--gol-ink); }.tile { display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--gol-ink); box-shadow: 3px 3px 0 var(--gol-ink); }.tile-lg { width: 64px; height: 64px; border-radius: 18px; font-size: 2rem; margin-bottom: 1rem; transform: rotate(var(--r)); }.step { padding: 1.6rem; }.step-num { font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--gol-muted); margin-bottom: .2rem; }.act-title { font-weight: 900; font-size: 1.15rem; line-height: 1.25; margin: 0; }.cta { position: relative; overflow: hidden; text-align: center; color: #fff; border-radius: 30px; padding: 3.5rem 1.25rem; background: linear-gradient(150deg, var(--gol-purple), var(--gol-purple-dark)); box-shadow: 0 6px 0 #2f1785; }.cta > * { position: relative; }.blob { position: absolute; border-radius: 46% 54% 60% 40%; }.blob-a { width: 220px; height: 220px; right: -80px; bottom: -90px; background: var(--gol-coral); opacity: .9; animation: spin 18s linear infinite; }.cta-title { font-weight: 900; font-size: clamp(2rem, 5vw, 2.8rem); }.cta-sub { font-weight: 700; opacity: .9; margin-bottom: 1.5rem; }.cta-emoji { position: absolute !important; font-size: 2.6rem; animation: bounce 2.4s ease-in-out infinite; }.e1 { top: 14%; left: 8%; }.e2 { top: 18%; right: 10%; animation-delay: 1s; }.btn-3d { font-family: var(--gol-font); font-weight: 900; font-size: 1.02rem; color: var(--gol-ink); border: 2px solid var(--gol-ink); border-radius: 999px; padding: .8rem 1.7rem; box-shadow: 0 4px 0 var(--gol-ink); transition: translate .1s, box-shadow .1s; }.btn-3d:hover { translate: 0 -2px; box-shadow: 0 6px 0 var(--gol-ink); }.btn-lime { background: var(--gol-lime); }.cta-button { animation: cta-bounce 1.65s ease-in-out infinite; }@keyframes spin { to { transform: rotate(360deg); } }@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px) rotate(8deg); } }@keyframes hint-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(5px); } }@keyframes cta-bounce { 0%,100% { transform: translateY(0); } 18% { transform: translateY(-14px); } 36% { transform: translateY(0); } 54% { transform: translateY(-7px); } 70% { transform: translateY(0); } }

.progress-bar{ position: fixed; top: 0; left: 0; right: 0; height: 5px; z-index: 1000; background: linear-gradient(90deg, var(--gol-lime), var(--gol-cyan), var(--gol-purple)); transform-origin: left; transform: scaleX(0)}.reveal{ opacity: 0; transform: translateY(40px); transition: opacity .7s ease, transform .8s cubic-bezier(.34, 1.56, .64, 1); transition-delay: var(--reveal-delay, 0ms)}.reveal.is-visible{ opacity: 1; transform: none}.chip-pop.reveal{ transform: translateY(30px) scale(.6)}.chip-pop.reveal.is-visible{ transform: none}.pop-in.reveal{ transform: scale(.7) rotate(-6deg)}.pop-in.reveal.is-visible{ transform: none}.ticker{ overflow: hidden; background: var(--gol-ink); padding: .7rem 0; rotate: -1.5deg; margin: .5rem -1rem 1rem; box-shadow: 0 4px 0 var(--gol-purple)}.ticker-track{ display: flex; gap: 2.6rem; width: max-content; animation: ticker 45s linear infinite}.ticker:hover .ticker-track{ animation-play-state: paused}.ticker-item{ color: #fff; font-weight: 900; white-space: nowrap; font-size: 1.05rem}.ticker-item:nth-child(3n + 1){ color: var(--gol-lime)}.ticker-item:nth-child(3n + 2){ color: var(--gol-yellow)}@keyframes ticker{ to{ transform: translateX(-50%)}}.why{ position: relative; overflow: hidden}.why > .row{ position: relative; z-index: 1}.float-emoji{ position: absolute; font-size: 3rem; opacity: .16; animation: drift 9s ease-in-out infinite; pointer-events: none}.f1{ top: 8%; right: 6%}.f2{ bottom: 10%; left: 4%; animation-delay: -3s}.f3{ top: 45%; left: 46%; animation-delay: -6s}@keyframes drift{ 0%, 100%{ transform: translate(0, 0) rotate(0)}33%{ transform: translate(14px, -18px) rotate(10deg)}66%{ transform: translate(-12px, 10px) rotate(-8deg)}}.strike{ position: relative; display: inline-block; opacity: 1 !important; transform: none !important}.strike::after{ content: ''; position: absolute; left: -3%; right: -3%; top: 55%; height: .14em; border-radius: 99px; background: var(--gol-coral); transform: scaleX(0); transform-origin: left; transition: transform .6s cubic-bezier(.65, 0, .35, 1) .5s}

.strike.is-visible::after{ transform: scaleX(1)}.wiggle-word{ display: inline-block; color: var(--gol-purple); animation: wiggle 2.8s ease-in-out infinite}@keyframes wiggle{ 0%, 80%, 100%{ transform: rotate(0)}85%{ transform: rotate(-6deg) scale(1.08)}90%{ transform: rotate(5deg) scale(1.08)}95%{ transform: rotate(-3deg)}}.chip{ transition: background .2s, color .2s, transform .2s}.chip:hover{ animation: jelly .5s}@keyframes jelly{ 0%, 100%{ transform: scale(1, 1)}30%{ transform: scale(1.12, .9)}50%{ transform: scale(.94, 1.06)}70%{ transform: scale(1.04, .97)}}.tilt{ transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) rotate(var(--r, 0deg)); transition: transform .15s ease-out; will-change: transform}.stat.tilt:hover{ transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-4px)}.step.tilt:hover{ transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px)}.steps .reveal.is-visible .tile-lg{ animation: tile-pop .8s cubic-bezier(.34, 1.56, .64, 1) both; animation-delay: calc(var(--reveal-delay, 0ms) + .2s)}.step:hover .tile-lg{ animation: tile-wiggle .6s ease-in-out}@keyframes tile-pop{ from{ transform: scale(0) rotate(-40deg)}to{ transform: scale(1) rotate(var(--r))}}@keyframes tile-wiggle{ 0%, 100%{ transform: rotate(var(--r))}25%{ transform: rotate(-14deg) scale(1.12)}50%{ transform: rotate(12deg) scale(1.12)}75%{ transform: rotate(-6deg)}}.gol-carousel{ position: relative; padding: 0 .25rem 2.4rem; user-select: none; touch-action: pan-y}.viewport{ overflow: hidden; border-radius: 26px; padding: .6rem 0 1rem}.track{ display: flex; transition: transform .7s cubic-bezier(.65, 0, .2, 1)}.slide{ padding: 0 .6rem; transition: transform .6s cubic-bezier(.34, 1.56, .64, 1), opacity .5s; opacity: .45; transform: scale(.94)}

.slide.in-view{ opacity: 1; transform: none}.slide.in-view:hover{ transform: translateY(-6px)}.nav-btn{ position: absolute; top: calc(50% - 1.2rem); translate: 0 -50%; z-index: 2; width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--gol-ink); background: #fff; color: var(--gol-ink); font-size: 1.8rem; font-weight: 900; line-height: 1; box-shadow: 0 3px 0 var(--gol-ink); transition: translate .15s, box-shadow .15s, background .15s}.nav-btn:hover{ background: var(--gol-lime); translate: 0 calc(-50% - 2px); box-shadow: 0 5px 0 var(--gol-ink)}.nav-btn:active{ translate: 0 calc(-50% + 2px); box-shadow: 0 1px 0 var(--gol-ink)}.prev{ left: -6px}.next{ right: -6px}@media (min-width: 1200px){ .prev{ left: -28px}.next{ right: -28px}}.dots{ position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: .5rem}.dot{ position: relative; overflow: hidden; width: 12px; height: 12px; padding: 0; border-radius: 999px; border: 2px solid var(--gol-ink); background: #fff; transition: width .3s}.dot.active{ width: 42px; background: var(--gol-purple-soft)}.fill{ position: absolute; inset: 0; background: var(--gol-purple); transform-origin: left; animation: fill linear forwards}.paused .fill{ animation-play-state: paused}@keyframes fill{ from{ transform: scaleX(0)}to{ transform: scaleX(1)}}.empty{ text-align: center; padding: 2rem; font-weight: 800; color: var(--gol-muted)}.swap-enter-active, .swap-leave-active{ transition: opacity .25s ease, transform .3s ease}.swap-enter-from{ opacity: 0; transform: translateX(40px)}.swap-leave-to{ opacity: 0; transform: translateX(-40px)}.blob-b{ width: 140px; height: 140px; left: -50px; top: -50px; background: var(--gol-lime); opacity: .85; animation: spin 14s linear infinite reverse}.e3{ bottom: 14%; left: 14%; animation-delay: .5s}

.burst-wrap{ position: relative; display: inline-block}.burst{ position: absolute; left: 50%; top: 50%; font-size: 1.8rem; pointer-events: none; animation: burst .7s cubic-bezier(.2, .8, .3, 1) forwards}@keyframes soft-float{ 0%, 100%{ transform: translateY(0)}50%{ transform: translateY(-8px)}}@keyframes soft-pop{ from{ opacity: 0; transform: scale(.7) rotate(var(--r))}to{ opacity: 1; transform: scale(1) rotate(var(--r))}}@keyframes burst{ from{ transform: translate(-50%, -50%) scale(.3); opacity: 1}to{ transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.1) rotate(200deg); opacity: 0}}@media (prefers-reduced-motion: reduce){ .blob-a{ animation-duration: 40s}.blob-b{ animation-duration: 36s}.cta-emoji, .float-emoji{ animation: soft-float 4s ease-in-out infinite}.e2{ animation-delay: 1s}.e3{ animation-delay: 2s}.f2{ animation-delay: -1.5s}.f3{ animation-delay: -3s}.cta-button{ animation: soft-float 3s ease-in-out infinite}.wiggle-word{ animation-duration: 4s}.reveal, .chip-pop.reveal, .pop-in.reveal{ transform: translateY(16px); transition: opacity .7s ease, transform .7s ease; transition-delay: var(--reveal-delay, 0ms)}.reveal.is-visible, .chip-pop.reveal.is-visible, .pop-in.reveal.is-visible{ transform: none}.ticker-track{ animation-duration: 70s}.steps .reveal.is-visible .tile-lg{ animation: soft-pop .7s ease both; animation-delay: calc(var(--reveal-delay, 0ms) + .2s)}.track{ transition-duration: .45s}.slide{ transition: opacity .3s; transform: none !important}}
</style>
