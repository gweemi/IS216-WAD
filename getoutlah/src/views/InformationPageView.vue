<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { INFORMATION_PAGES, LAST_UPDATED } from '@/config/informationPages'
import LandingFooter from '@/components/landing/LandingFooter.vue'

const route = useRoute()
const page = computed(() => INFORMATION_PAGES[route.meta.page])
</script>

<template>
  <main v-if="page" class="info-page" :class="{ 'info-page--about': route.meta.page === 'about' }">
    <div class="info-container">
      <RouterLink :to="{ name: 'landing' }" class="back-link"><i class="bi bi-arrow-left" aria-hidden="true"></i> Back</RouterLink>
      <article class="info-card">
        <header class="info-header">
          <p class="gol-eyebrow">{{ page.eyebrow }}</p>
          <h1>{{ page.title }}</h1>
          <p class="intro">{{ page.intro }}</p>
          <p v-if="page.updated" class="updated">Last updated: {{ LAST_UPDATED }}</p>
        </header>

        <section v-if="page.mission" class="mission"><h2>Our mission</h2><p>{{ page.mission }}</p></section>
        <section v-if="page.features" class="features" aria-labelledby="features-title"><h2 id="features-title">What you can do</h2><div class="feature-grid"><article v-for="feature in page.features" :key="feature.title" class="feature-card"><i class="bi" :class="feature.icon" aria-hidden="true"></i><h3>{{ feature.title }}</h3><p>{{ feature.text }}</p></article></div></section>

        <section v-for="section in page.sections" :key="section.title" class="info-section"><h2>{{ section.title }}</h2><p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p><ul v-if="section.bullets"><li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li></ul></section>
        <p v-if="page.closing" class="closing">{{ page.closing }}</p>
      </article>
    </div>
    <LandingFooter />
  </main>
</template>

<style scoped>
.info-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--gol-bg); color: var(--gol-ink); font-family: var(--gol-font); }.info-container { width: min(100% - 2rem, 860px); flex: 1; margin: 0 auto; padding: 2rem 0 3rem; }.back-link { display: inline-flex; align-items: center; gap: .45rem; margin-bottom: 1.25rem; padding: 0; color: var(--gol-purple); background: none; border: 0; font: 800 .9rem var(--gol-font); text-decoration: none; }.back-link:hover { color: var(--gol-purple-dark); text-decoration: underline; text-underline-offset: .2rem; }.info-card { padding: clamp(1.5rem, 5vw, 3.5rem); background: #fff; border-radius: 30px; box-shadow: 0 6px 0 var(--gol-card-edge); }.info-header { padding-bottom: 1.7rem; border-bottom: 2px solid var(--gol-purple-soft); }.info-header h1 { margin: .35rem 0 .8rem; color: var(--gol-purple); font-size: clamp(2.15rem, 7vw, 3.4rem); font-weight: 900; line-height: 1.05; }.intro { max-width: 43rem; margin: 0; color: var(--gol-muted); font-size: 1.08rem; font-weight: 600; line-height: 1.6; }.updated { margin: 1rem 0 0; color: var(--gol-muted); font-size: .8rem; font-weight: 800; }.info-section,.mission,.features { margin-top: 2.25rem; }.info-section h2,.mission h2,.features h2 { margin-bottom: .75rem; color: var(--gol-purple); font-size: 1.35rem; font-weight: 900; }.info-section p,.mission p,.feature-card p { color: var(--gol-muted); font-weight: 600; line-height: 1.65; }.info-section p + p { margin-top: .85rem; }.info-section ul { display: grid; gap: .55rem; margin: 1rem 0 0; padding-left: 1.25rem; color: var(--gol-muted); font-weight: 600; line-height: 1.55; }.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: .85rem; }.feature-card { padding: 1rem; background: var(--gol-bg); border-radius: 18px; }.feature-card > i { display: inline-grid; width: 38px; height: 38px; place-items: center; margin-bottom: .55rem; color: var(--gol-purple); background: var(--gol-purple-soft); border-radius: 12px; font-size: 1.15rem; }.feature-card h3 { margin: 0 0 .3rem; font-size: 1rem; font-weight: 900; }.feature-card p { margin: 0; font-size: .84rem; }.closing { margin: 2.25rem 0 0; padding: 1rem 1.15rem; color: var(--gol-purple); background: var(--gol-purple-soft); border-radius: 18px; font-weight: 800; line-height: 1.55; }.info-page--about .info-header { padding: clamp(1rem, 4vw, 2rem); margin: calc(clamp(1rem, 4vw, 2rem) * -1); margin-bottom: 1.7rem; border-radius: 22px; background: linear-gradient(135deg, var(--gol-purple), var(--gol-purple-dark)); border: 0; }.info-page--about .info-header .gol-eyebrow { color: var(--gol-yellow); }.info-page--about .info-header h1 { color: var(--gol-lime); text-shadow: 3px 3px 0 var(--gol-ink); }.info-page--about .intro { color: #fff; }.landing-footer { margin-top: auto; } @media (max-width: 480px) { .info-container { width: min(100% - 2.5rem, 860px); padding-top: 1.25rem; }.info-card { border-radius: 24px; }.feature-grid { grid-template-columns: 1fr; } }
</style>
