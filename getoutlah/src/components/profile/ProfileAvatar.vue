<!--
  Round profile picture, or the person's initials when there's no picture
  (or the picture fails to load).
  <ProfileAvatar :src="photo" :name="displayName" :size="88" />
-->
<script setup>
import { ref, watch } from 'vue'
import { initialsFor } from '@/utils/profile'

const props = defineProps({
  src: { type: String, default: null },
  name: { type: String, default: '' },
  size: { type: Number, default: 88 },
})

const broken = ref(false)
watch(() => props.src, () => (broken.value = false))
</script>

<template>
  <span class="avatar" :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.36 + 'px' }">
    <img v-if="src && !broken" :src="src" alt="" referrerpolicy="no-referrer" @error="broken = true" />
    <span v-else aria-hidden="true">{{ initialsFor(name) }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--gol-yellow);
  color: var(--gol-ink);
  font-weight: 900;
  border: 3px solid #fff;
  box-shadow: 4px 4px 0 var(--gol-ink);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
