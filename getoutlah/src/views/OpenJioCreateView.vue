<script setup>
import { useRouter } from 'vue-router'
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'

const router = useRouter()
const backToManagement = () => router.replace({ name: 'openjio' })
</script>

<template>
  <CreateJioSheet open @close="backToManagement" @created="backToManagement" />
</template>
