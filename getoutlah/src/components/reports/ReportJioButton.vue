<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOpenJioStore } from '@/stores/openjio'
import { statusOf } from '@/utils/openjio'
import { accountRestriction, restrictionMessage } from '@/utils/reports'
import ReportJioSheet from '@/components/reports/ReportJioSheet.vue'

const props = defineProps({
  jio: { type: Object, default: null },
  jioId: { type: String, default: '' },
})

const auth = useAuthStore()
const jios = useOpenJioStore()
const showForm = ref(false)
const thanks = ref(false)

const current = computed(() => props.jio ?? jios.all.find((j) => j.id === props.jioId) ?? null)
const restriction = computed(() => accountRestriction(auth.profile))
const canReport = computed(() => {
  if (!current.value || !auth.user) {
    return false
  }
  if (current.value.hostId === auth.user.uid) {
    return false
  }
  const status = statusOf(current.value)
  return status !== 'cancelled' && status !== 'ended' && status !== 'suspended'
})

onMounted(() => { if (!props.jio) jios.start() })
</script>

<template>
  <div v-if="canReport || thanks" class="report-wrap">
    <p v-if="thanks" class="report-thanks" role="status">Thanks. An admin will look at your report.</p>
    <button
      v-else
      type="button"
      class="report-button"
      :disabled="!!restriction"
      :title="restrictionMessage(restriction) || 'Report this OPENJIO'"
      data-testid="report-jio"
      @click="showForm = true"
    >
      <i class="bi bi-flag" aria-hidden="true"></i> Report
    </button>
    <ReportJioSheet :open="showForm" :jio="current" @close="showForm = false" @reported="thanks = true" />
  </div>
</template>

<style scoped>
.report-wrap { display: flex; justify-content: flex-end; }
.report-button {
  border: none; background: transparent; padding: 0.2rem 0.4rem; border-radius: 999px;
  color: var(--gol-muted); font-weight: 800; font-size: 0.78rem;
}
.report-button:hover:not(:disabled) { color: var(--gol-coral-text); }
.report-button:disabled { opacity: 0.5; cursor: not-allowed; }
.report-thanks { margin: 0; color: var(--gol-purple); font-weight: 800; font-size: 0.8rem; }
</style>
