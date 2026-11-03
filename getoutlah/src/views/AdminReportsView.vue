<script setup>
// Admin: OpenJios that users reported, and the users who are banned or suspended.
// A reported jio is suspended until an admin restores or removes it.
import { ref } from 'vue'
import ReportedJios from '@/components/admin/ReportedJios.vue'
import RestrictedUsers from '@/components/admin/RestrictedUsers.vue'

const restrictedUsers = ref(null)

// After banning or suspending someone, refresh the "Banned and suspended users" list
function refreshRestrictedUsers() {
  if (restrictedUsers.value) {
    restrictedUsers.value.load()
  }
}
</script>

<template>
  <ReportedJios @changed="refreshRestrictedUsers" />
  <RestrictedUsers ref="restrictedUsers" />
</template>
