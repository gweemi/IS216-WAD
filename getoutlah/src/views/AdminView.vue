<script setup>
// The admin page: a tab per tool, each tab is a child route in src/router/index.js.
// The router only lets admins in.
import '@/assets/discovery.css'

const tabs = [
  { name: 'admin-activities', label: 'Activities', icon: 'bi-stars' },
  { name: 'admin-reports', label: 'Reports', icon: 'bi-flag' },
]
</script>

<template>
  <div class="gol-page">
    <div class="container py-4" style="max-width: 640px">
      <RouterLink :to="{ name: 'profile' }" class="det-back d-inline-block mb-3" data-testid="admin-back"><i class="bi bi-arrow-left"></i> Back to profile</RouterLink>
      <div class="gol-eyebrow">Admin</div>
      <h1 class="gol-title">Admin</h1>

      <nav class="adm-tabs" aria-label="Admin tools">
        <RouterLink v-for="t in tabs" :key="t.name" :to="{ name: t.name }" class="adm-tab">
          <i class="bi" :class="t.icon" aria-hidden="true"></i> {{ t.label }}
        </RouterLink>
      </nav>

      <RouterView />
    </div>
  </div>
</template>
