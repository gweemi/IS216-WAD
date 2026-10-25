<!--
  The two wellbeing rows for the Settings pop-up (matches Figma):
    • Study-break mode   – pauses streaks; points and badges are kept
    • Reflection prompts – shows/hides the "How was it?" banner after check-ins
  Usage in the Settings pop-up (as the first rows):  <WellbeingSettings />
-->
<template>
  <div class="d-grid gap-2">
    <label v-for="row in rows" :key="row.id" class="toggle-row d-flex justify-content-between align-items-center gap-3" :for="row.id">
      <span>
        <span class="d-block row-title">{{ row.title }}</span>
        <span class="d-block row-sub">{{ row.on ? row.onText : row.offText }}</span>
      </span>
      <span class="form-check form-switch m-0">
        <input
          :id="row.id"
          class="form-check-input gol-switch"
          type="checkbox"
          role="switch"
          :checked="row.on"
          @change="row.set($event.target.checked)"
        />
      </span>
    </label>
  </div>
</template>

<script>
import { game, setStudyBreak } from '../../stores/gamification(badges).js'
import { reflections, setPromptsOn } from '../../stores/reflections.js'

export default {
  name: 'WellbeingSettings',
  data() {
    return { game, reflections }
  },
  computed: {
    rows() {
      return [
        {
          id: 'studyBreakSwitch',
          title: 'Study-break mode',
          on: this.game.studyBreak.active,
          onText: 'Streaks and reminders paused. Good luck for exams!',
          offText: 'Pause streaks and reminders during exams',
          set: setStudyBreak,
        },
        {
          id: 'reflectionPromptSwitch',
          title: 'Reflection prompts',
          on: this.reflections.promptsOn,
          onText: 'Ask how I felt after each activity',
          offText: 'Off. You can still reflect from your Profile',
          set: setPromptsOn,
        },
      ]
    },
  },
}
</script>

<style scoped>
.toggle-row { font-family: var(--gol-font); color: var(--gol-ink); cursor: pointer; padding: 0.25rem 0; }
.row-title { font-weight: 800; }
.row-sub { font-size: 0.8rem; font-weight: 600; color: var(--gol-muted); }
</style>
