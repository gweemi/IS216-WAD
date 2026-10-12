<script setup>
import { isFirebaseConfigured } from '@/firebase'
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
  <RouterView />
</template>
