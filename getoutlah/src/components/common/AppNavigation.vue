<script setup>
const links = [
  { name: 'friends', label: 'Friends', icon: 'bi-people' },
  { name: 'activities', label: 'Activities', icon: 'bi-stars' },
  { name: 'map', label: 'Map', icon: 'bi-map' },
  { name: 'badges', label: 'Badges', icon: 'bi-award' },
  { name: 'profile', label: 'Profile', icon: 'bi-person' },
]
</script>

<template>
  <nav class="app-navigation" aria-label="Main navigation" data-testid="app-navigation">
    <RouterLink
      v-for="link in links"
      :key="link.name"
      :to="{ name: link.name }"
      class="nav-link"
      :data-testid="`nav-${link.name}`"
    >
      <span class="nav-icon" aria-hidden="true"><i class="bi" :class="link.icon"></i></span>
      <span class="nav-label">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-navigation {
  position: fixed;
  z-index: 1040;
  right: 0.75rem;
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  left: 0.75rem;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  padding: 0.55rem 0.35rem calc(0.45rem + env(safe-area-inset-bottom));
  border: 2px solid var(--gol-card-edge);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(34, 26, 59, 0.16);
  backdrop-filter: blur(12px);
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.25rem 0.1rem;
  color: #9a8ca6;
  font-family: var(--gol-font);
  font-size: 0.69rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  text-decoration: none;
}

.nav-icon {
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border-radius: 50%;
  font-size: 1.28rem;
}

.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.nav-link.router-link-active { color: var(--gol-purple); }
.nav-link.router-link-active .nav-icon {
  color: var(--gol-ink);
  background: var(--gol-yellow);
  box-shadow: inset 0 -3px 0 #e5ae23;
}

@media (min-width: 768px) {
  .app-navigation {
    right: auto;
    bottom: 1.5rem;
    /* Anchor to the visual viewport so a route's scrollbar cannot shift the bar. */
    left: 50vw;
    width: min(620px, calc(100vw - 2rem));
    padding: 0.55rem;
    transform: translateX(-50%);
  }

  .nav-link { font-size: 0.8rem; }
  .nav-icon { width: 2.5rem; height: 2.5rem; font-size: 1.45rem; }
}
</style>
