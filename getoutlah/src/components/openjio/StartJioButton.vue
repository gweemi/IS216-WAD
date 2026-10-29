<!--
  Drop-in "Start a jio" button for any page. It opens the create form itself.
    <StartJioButton />
    <StartJioButton label="OpenJio this" :prefill="{ title: a.title, location: a.location }" />
    <StartJioButton label="OpenJio at this time" :prefill="{ startAt: slotStart, visibility: 'friends' }" />
  Emits `created` with the new jio's id.
-->
<template>
  <button type="button" :class="buttonClass" data-testid="start-jio-button" @click="open = true">
    <i class="bi bi-plus-lg"></i> {{ label }}
  </button>
  <CreateJioSheet :open="open" :prefill="prefill" @close="open = false" @created="onCreated" />
</template>

<script>
import CreateJioSheet from '@/components/openjio/CreateJioSheet.vue'

export default {
  name: 'StartJioButton',
  components: { CreateJioSheet },
  props: {
    label: { type: String, default: 'Start a jio' },
    prefill: { type: Object, default: null },
    // 'coral' (default), 'primary' or 'soft': the team's button styles
    variant: { type: String, default: 'coral' },
  },
  emits: ['created'],
  data() {
    return { open: false }
  },
  computed: {
    buttonClass() {
      return { coral: 'gol-btn-coral', primary: 'gol-btn-primary', soft: 'gol-btn-soft' }[this.variant]
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
