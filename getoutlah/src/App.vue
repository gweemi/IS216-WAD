<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isFirebaseConfigured } from '@/firebase'
import AppNavigation from '@/components/common/AppNavigation.vue'

const route = useRoute()
const showNavigation = computed(() => route.meta.appNavigation === true)
const isMapLayout = computed(() => route.meta.mapLayout === true)
</script>

<template>
  <div
    v-if="!isFirebaseConfigured"
    class="alert alert-warning rounded-0 mb-0 small"
    role="alert"
    data-testid="config-warning"
  >
    Firebase isn't set up yet. Copy <code>.env.example</code> to <code>.env.local</code>, add your
    project's keys, then restart <code>pnpm dev</code>.
  </div>
  <div
    class="app-content"
    :class="{
      'app-content--with-navigation': showNavigation,
      'app-content--map-layout': isMapLayout,
    }"
  >
    <RouterView />
  </div>
  <AppNavigation v-if="showNavigation" />
</template>

<style>
.app-content { min-height: 100vh; }
.app-content--with-navigation { padding-bottom: 6.5rem; }

@media (max-width: 767.98px) {
  .app-content--map-layout { padding-bottom: 0; }
}

@media (min-width: 768px) {
  .app-content--with-navigation { padding-bottom: 7.5rem; }
}
</style>
