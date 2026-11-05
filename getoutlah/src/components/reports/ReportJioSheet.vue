<script setup>
import { ref, reactive, watch } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import SheetHeader from '@/components/common/SheetHeader.vue'
import { REPORT_GROUPS, REPORT_REASONS } from '@/config/reportReasons'
import { DETAILS_MAX, validateReport } from '@/utils/reports'
import { reportJio } from '@/services/api/reports'

const props = defineProps({
  open: { type: Boolean, default: false },
  jio: { type: Object, default: null },
})
const emit = defineEmits(['close', 'reported'])

const form = reactive({ reason: '', details: '' })
const sending = ref(false)
const error = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) Object.assign(form, { reason: '', details: '' })
  error.value = ''
})

const reasonsIn = (groupId) => REPORT_REASONS.filter((r) => r.group === groupId)

async function send() {
  error.value = validateReport(form)[0] ?? ''
  if (error.value) return
  sending.value = true
  try {
    await reportJio(props.jio, form)
    emit('reported')
    emit('close')
  } catch (e) {
    error.value = e.code === 'permission-denied'
      ? "You can't report this OPENJIO right now. Refresh and try again."
      : e.message
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" label="Report this OPENJIO" @close="emit('close')">
    <SheetHeader class="mb-2" eyebrow="Keep GetOutLah! safe" title="Report this OPENJIO" title-class="fs-3" @close="emit('close')" />
    <p class="report-help">
      “{{ jio ? jio.title : '' }}” will be suspended straight away while an admin looks at your report.
      The host won't see who reported it.
    </p>

    <form @submit.prevent="send">
      <fieldset v-for="g in REPORT_GROUPS" :key="g.id" class="report-group">
        <legend class="report-legend">{{ g.label }}</legend>
        <label v-for="r in reasonsIn(g.id)" :key="r.id" class="report-reason" :class="{ on: form.reason === r.id }">
          <input v-model="form.reason" type="radio" name="report-reason" :value="r.id" class="form-check-input" />
          <span>
            {{ r.label }}
            <small v-if="r.hint" class="d-block report-hint">{{ r.hint }}</small>
          </span>
        </label>
      </fieldset>

      <label class="report-legend d-block mt-3" for="report-details">
        Anything else we should know? <span class="report-hint">(optional unless you picked “Something else”)</span>
      </label>
      <textarea id="report-details" v-model="form.details" class="form-control" rows="3" :maxlength="DETAILS_MAX"></textarea>

      <p v-if="error" class="report-error" role="alert">{{ error }}</p>
      <button class="gol-btn-coral w-100 mt-3" type="submit" :disabled="sending">
        {{ sending ? 'Sending…' : 'Send report' }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.report-help { color: var(--gol-muted); font-weight: 600; font-size: 0.85rem; }
.report-group { margin-top: 0.8rem; }
.report-legend { font-weight: 900; font-size: 0.85rem; margin-bottom: 0.3rem; }
.report-reason {
  display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.5rem 0.7rem; margin-bottom: 0.3rem;
  border: 1px solid var(--gol-card-edge); border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer;
}
.report-reason.on { border-color: var(--gol-coral); background: #fff1ee; }
.report-reason input { margin-top: 0.2rem; flex-shrink: 0; }
.report-hint { color: var(--gol-muted); font-weight: 600; font-size: 0.75rem; }
.report-error { margin: 0.6rem 0 0; color: var(--gol-coral-text); font-weight: 800; font-size: 0.85rem; }
</style>
