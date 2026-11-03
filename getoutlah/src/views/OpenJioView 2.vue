<!--
  OPENJIO! page (/openjio). The same panel can also sit inside the
  Activities page as its "OpenJio!" view. See OPENJIO.md.
-->
<template>
  <main class="gol-page">
    <div class="container py-3 py-md-4 page-inner">
      <header class="mb-3">
        <RouterLink :to="{ name: 'activities', query: { view: 'openJio' } }" class="back-link">
          <i class="ph ph-arrow-left" aria-hidden="true"></i> Back to activities
        </RouterLink>
        <p class="gol-eyebrow">The more the merrier</p>
        <h1 class="gol-title">OPENJIO!</h1>
      </header>
      <OpenJioPanel />
    </div>
  </main>
</template>

<script>
import OpenJioPanel from '@/components/openjio/OpenJioPanel.vue'

export default {
  name: 'OpenJioView',
  components: { OpenJioPanel },
}
</script>

<style scoped>
.page-inner { max-width: 1100px; }
.back-link { display: inline-flex; align-items: center; gap: .35rem; margin-bottom: .7rem; color: var(--gol-purple); font-weight: 900; text-decoration: none; }
.back-link:hover, .back-link:focus-visible { color: var(--gol-ink); text-decoration: underline; }
</style>
