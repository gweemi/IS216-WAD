<!--
  Floating "How was it?" banner that appears after a check-in.
  Put it ONCE in App.vue, under <RouterView />:
    <ReflectionPrompt />
  It works on every page, so a check-in from the Map page still asks
  for a reflection.
-->
<template>
  <div>
    <Transition name="prompt">
      <div v-if="current && !sheetOpen" class="reflect-prompt" role="status">
        <span class="gol-icon-tile prompt-icon"><i class="bi bi-chat-heart"></i></span>
        <button class="prompt-text text-start" @click="sheetOpen = true">
          <span class="d-block prompt-title">How was {{ current.activityTitle }}?</span>
          <span class="d-block prompt-sub">Tap to reflect · 30 seconds · private</span>
        </button>
        <button class="prompt-close" aria-label="Not now" @click="snooze"><i class="bi bi-x-lg"></i></button>
      </div>
    </Transition>

    <ReflectionSheet :open="sheetOpen" :item="activeItem" @close="sheetOpen = false" @pick="openActivity" />
  </div>
</template>

<script>
import ReflectionSheet from './ReflectionSheet.vue'
import { reflections, dismissPrompt } from '../../stores/reflections.js'

// Wait this long after check-in before asking (0 = straight away, good for demos).
// Set to e.g. 60 so students are asked after the activity, not when they arrive.
const ASK_AFTER_MINUTES = 0

export default {
  name: 'ReflectionPrompt',
  components: { ReflectionSheet },
  data() {
    return {
      store: reflections,
      sheetOpen: false,
      frozenItem: null, // keeps the sheet content stable while it's open
      now: Date.now(),
      timer: null,
    }
  },
  computed: {
    current() {
      if (!this.store.promptsOn) return null // turned off in Settings
      return (
        this.store.pending.find(
          (p) =>
            !this.store.dismissed.includes(p.activityId) &&
            this.now - new Date(p.checkedInAt).getTime() >= ASK_AFTER_MINUTES * 60000
        ) || null
      )
    },
    activeItem() {
      return this.frozenItem || this.current
    },
  },
  watch: {
    sheetOpen(isOpen) {
      this.frozenItem = isOpen ? this.current : null
    },
  },
  mounted() {
    this.timer = setInterval(() => (this.now = Date.now()), 30000)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    snooze() {
      // Hide it (remembered); it stays in "My reflections" so they can do it later
      if (this.current) dismissPrompt(this.current.activityId)
    },
    openActivity(activity) {
      // If a teammate made an activity details page named 'activity', go there
      if (this.$router && this.$router.hasRoute('activity')) {
        this.$router.push({ name: 'activity', params: { id: activity.id } })
      }
    },
  },
}
</script>

<style scoped>
.reflect-prompt {
  font-family: var(--gol-font);
  color: var(--gol-ink);
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(90px + env(safe-area-inset-bottom)); /* sits above the bottom nav */
  z-index: 1040;
  width: min(440px, calc(100% - 24px));
  display: flex;
  align-items: center;
  gap: 0.7rem;
  background: #fff;
  border: 2px solid var(--gol-ink);
  border-radius: 20px;
  padding: 0.6rem 0.6rem 0.6rem 0.75rem;
  box-shadow: 4px 4px 0 var(--gol-ink);
}
@media (min-width: 992px) {
  .reflect-prompt { bottom: 24px; left: auto; right: 24px; transform: none; }
}
.prompt-icon { background: var(--gol-coral); width: 40px; height: 40px; font-size: 1.1rem; }
.prompt-text {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  color: inherit;
}
.prompt-title {
  font-weight: 900;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prompt-sub { font-size: 0.72rem; font-weight: 600; color: var(--gol-muted); }
.prompt-close {
  border: none;
  background: var(--gol-purple-soft);
  color: var(--gol-purple);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Slide up from the bottom */
.prompt-enter-active,
.prompt-leave-active { transition: opacity 0.3s ease, translate 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.prompt-enter-from,
.prompt-leave-to { opacity: 0; translate: 0 30px; }
</style>
