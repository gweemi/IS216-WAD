<script setup>
import { ref } from 'vue'
import ReportedJios from '@/components/admin/ReportedJios.vue'
import RestrictedUsers from '@/components/admin/RestrictedUsers.vue'

const restrictedUsers = ref(null)

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
