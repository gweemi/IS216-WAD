<script setup>
import { useId } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search...' },
  label: { type: String, default: 'Search' },
})

const emit = defineEmits(['update:modelValue', 'submit'])
const inputId = useId()

function submit() {
  emit('submit', props.modelValue)
}
</script>

<template>
  <div class="d-flex align-items-center flex-grow-1 gol-search-bar" data-testid="search-bar">
    <label class="visually-hidden" :for="inputId">{{ label }}</label>
    <i class="bi bi-search gol-search-bar__icon" aria-hidden="true"></i>
    <input
      :id="inputId"
      class="form-control border-0 shadow-none"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      data-testid="map-search-input"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown.enter="submit"
    />
  </div>
</template>

<style scoped>
.gol-search-bar {
  min-width: 0;
  min-height: 3.5rem;
  padding-left: 1.1rem;
  border: 2px solid var(--gol-card-edge);
  border-radius: 999px;
  background: var(--gol-card);
  box-shadow: 0 4px 10px rgba(34, 26, 59, 0.12);
}

.gol-search-bar__icon {
  margin-right: 0.75rem;
  color: var(--gol-purple);
  font-size: 1.4rem;
}

.gol-search-bar .form-control {
  min-width: 0;
  padding: 0.65rem 1rem 0.65rem 0;
  border-radius: 0;
  background: transparent;
  color: var(--gol-ink);
  font-family: var(--gol-font);
  font-size: 1rem;
  font-weight: 800;
}

.gol-search-bar .form-control::placeholder { color: #9a8ca6; opacity: 1; }
</style>
