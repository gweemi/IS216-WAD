<!-- Round profile photo, or initials when there is no photo. -->
<script setup>
import { computed } from 'vue'
import { initials } from '@/utils/friends'

const props = defineProps({
  name: { type: String, default: '' },
  photo: { type: String, default: null },
  size: { type: Number, default: 48 },
})
const letters = computed(() => initials(props.name))
const box = computed(() => ({ width: props.size + 'px', height: props.size + 'px', fontSize: props.size * 0.38 + 'px' }))
</script>

<template>
  <img
    v-if="photo"
    :src="photo"
    alt=""
    class="rounded-circle border border-2 border-dark flex-shrink-0 object-fit-cover"
    :style="box"
    referrerpolicy="no-referrer"
  />
  <span
    v-else
    class="rounded-circle border border-2 border-dark flex-shrink-0 d-inline-flex align-items-center justify-content-center fw-bolder"
    :style="{ ...box, background: 'var(--gol-cyan)' }"
    aria-hidden="true"
  >{{ letters }}</span>
</template>
