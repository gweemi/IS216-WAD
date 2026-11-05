<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'
import { useOpenJioStore } from '@/stores/openjio'

const route = useRoute()
const router = useRouter()
const jios = useOpenJioStore()
const jio = computed(() => jios.all.find((item) => item.id === route.params.id) ?? null)
// Back to where Edit was pressed (usually the jio's details page); OPENJIO list if opened directly
const backToManagement = () => (window.history.state?.back ? router.back() : router.replace({ name: 'activities', query: { view: 'openJio' } }))

onMounted(() => jios.start())
</script>

<template>
  <CreateJioSheet v-if="jio" open :edit-jio="jio" @close="backToManagement" @updated="backToManagement" />
  <main v-else class="gol-page"><p class="container py-4 fw-bold">Loading OPENJIO…</p></main>
</template>
