<script setup>
const links = [
  { name: 'privacy', label: 'Privacy Policy' },
  { name: 'terms', label: 'Terms of Use' },
  { name: 'guidelines', label: 'Community Guidelines' },
  { name: 'about', label: 'About Us' },
]

function scrollToTop() {
  window.scrollTo(0, 0)
}
</script>

<template>
  <footer class="landing-footer">
    <div class="footer-inner">
      <p class="credit">© 2026 GetOutLah! · G3T7 · IS216 Web Application Development 2, SMU</p>
      <nav aria-label="Footer navigation" class="footer-links">
        <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }" @click="scrollToTop">
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer { margin-top: 1rem; padding: 1.5rem 0 2rem; border-top: 2px solid color-mix(in srgb, var(--gol-ink) 14%, transparent); color: var(--gol-muted); font-family: var(--gol-font); }
.footer-inner { box-sizing: border-box; width: 100%; padding-inline: var(--landing-section-padding, 1.25rem); margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
.credit { margin: 0; font-size: .78rem; font-weight: 700; }
.footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: .45rem .9rem; }
.footer-links a { color: var(--gol-purple); font-size: .8rem; font-weight: 800; text-decoration: none; }
.footer-links a:hover { color: var(--gol-purple-dark); text-decoration: underline; text-underline-offset: .2rem; }
@media (min-width: 576px) { .footer-inner { max-width: 540px; } }
@media (min-width: 768px) { .footer-inner { max-width: 720px; flex-direction: row; justify-content: space-between; text-align: left; } .footer-links { justify-content: flex-end; } }
@media (min-width: 992px) { .footer-inner { max-width: 960px; } }
@media (min-width: 1200px) { .footer-inner { max-width: 1140px; } }
@media (min-width: 1400px) { .footer-inner { max-width: 1320px; } }
</style>
