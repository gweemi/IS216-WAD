<!--
  OPENJIO! page (/openjio). The same panel can also sit inside the
  Activities page as its "OpenJio!" view. See OPENJIO.md.
-->
<template>
  <main class="gol-page">
    <div class="container py-3 py-md-4 page-inner">
      <header class="mb-3">
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
</style>
