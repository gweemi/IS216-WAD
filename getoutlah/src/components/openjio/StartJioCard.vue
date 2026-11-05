<template>
  <div class="start-jio-card-wrap">
    <button
      type="button"
      class="start-jio-card"
      :disabled="!!notice"
      data-testid="start-jio-card"
      @click="open = true"
    >
      <span class="start-jio-card__icon" aria-hidden="true"><i class="bi bi-plus-lg"></i></span>
      <span class="start-jio-card__label">Start a jio</span>
      <span v-if="!notice" class="start-jio-card__hint">Got a plan? Gather the crew.</span>
      <span v-if="notice" class="start-jio-card__notice">
        {{ notice.title }}
        <span v-if="notice.detail" class="d-block">{{ notice.detail }}</span>
      </span>
    </button>
    <CreateJioSheet v-if="!notice" :open="open" @close="open = false" @created="onCreated" />
  </div>
</template>

<script>
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { accountRestriction, startJioNotice } from '@/utils/reports'

export default {
  name: 'StartJioCard',
  components: { CreateJioSheet },
  emits: ['created'],
  data() {
    return { open: false }
  },
  computed: {
    notice() {
      return startJioNotice(accountRestriction(useAuthStore().profile))
    },
  },
  methods: {
    onCreated(id) {
      this.open = false
      this.$emit('created', id)
    },
  },
}
</script>

<style scoped>
.start-jio-card-wrap { display: flex; }
.start-jio-card {
  flex: 1;
  min-height: 12rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 1.25rem;
  border: 2.5px dashed rgba(107, 66, 227, 0.45);
  border-radius: 20px;
  background:
    radial-gradient(circle at 15% 10%, rgba(255, 134, 112, 0.14), transparent 45%),
    radial-gradient(circle at 85% 90%, rgba(107, 66, 227, 0.12), transparent 50%),
    #faf8ff;
  color: var(--gol-purple);
  font-family: var(--gol-font);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}
.start-jio-card:hover,
.start-jio-card:focus-visible {
  border-color: var(--gol-purple);
  background-color: var(--gol-purple-soft);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(107, 66, 227, 0.14);
}
.start-jio-card:focus-visible { outline: 3px solid rgba(107, 66, 227, 0.25); outline-offset: 2px; }
.start-jio-card__icon {
  display: grid;
  place-items: center;
  width: 3.2rem;
  height: 3.2rem;
  margin-bottom: 0.2rem;
  border-radius: 50%;
  background: var(--gol-coral);
  box-shadow: 0 3px 0 #e0654f;
  color: #fff;
  font-size: 1.45rem;
  transition: transform 0.18s ease;
}
.start-jio-card:hover .start-jio-card__icon,
.start-jio-card:focus-visible .start-jio-card__icon { transform: rotate(90deg) scale(1.05); }
.start-jio-card__label { font-weight: 900; font-size: 1.05rem; color: var(--gol-ink); }
.start-jio-card__hint { font-weight: 700; font-size: 0.8rem; color: var(--gol-muted); }
.start-jio-card:disabled { cursor: not-allowed; opacity: 0.6; transform: none; box-shadow: none; }
.start-jio-card:disabled .start-jio-card__icon { background: var(--gol-muted); box-shadow: none; transform: none; }
.start-jio-card__notice { color: #b4382f; font-weight: 800; font-size: 0.78rem; text-align: center; }
@media (prefers-reduced-motion: reduce) {
  .start-jio-card, .start-jio-card__icon { transition: none; }
  .start-jio-card:hover, .start-jio-card:hover .start-jio-card__icon { transform: none; }
}
</style>
