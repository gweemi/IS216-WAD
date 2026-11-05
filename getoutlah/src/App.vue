<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isFirebaseConfigured } from '@/firebase'
import AppNavigation from '@/components/common/AppNavigation.vue'
import NewBadgePopup from '@/components/badges/NewBadgePopup.vue'
import { useJioBadgeSync } from '@/composables/useJioBadgeSync'
import { useMapIntroState } from '@/composables/useMapIntroState'
import { useAuthStore } from '@/stores/auth'
import { accountRestriction, restrictionMessage } from '@/utils/reports'

const route = useRoute()
const showNavigation = computed(() => route.meta.appNavigation === true)
const isMapLayout = computed(() => route.meta.mapLayout === true)
const { mapIntroActive } = useMapIntroState()

const auth = useAuthStore()
const restrictionNotice = computed(() => restrictionMessage(accountRestriction(auth.profile)))

useJioBadgeSync()
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
  <div v-if="restrictionNotice" class="alert alert-danger rounded-0 mb-0 small fw-bold" role="alert" data-testid="restriction-notice">
    {{ restrictionNotice }}
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
  <AppNavigation v-if="showNavigation && !mapIntroActive" />
  <NewBadgePopup />
</template>

<style>
:root {
  --app-navigation-clearance: 6.5rem;
}

html,
body,
#app {
  min-height: 100%;
  background: var(--gol-bg);
}

.app-content {
  min-height: 100dvh;
}

.app-content--with-navigation > :not(.map-page) {
  box-sizing: border-box;
  padding-bottom: var(--app-navigation-clearance);
}

@media (min-width: 768px) {
  :root {
    --app-navigation-clearance: 7.5rem;
  }
}
</style>
