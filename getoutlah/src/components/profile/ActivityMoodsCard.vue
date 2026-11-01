<!--
  "Activity moods" card + pop-up for the Profile page.
  Every completed activity can be rated with an emoji. Ratings are private
  and saved with the reflections (stores/reflections.js), so the
  "What should I do next?" suggestions use them too.
-->
<script setup>
import { ref, computed } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { game } from '@/stores/gamification(badges).js'
import { reflections, moodInsight } from '@/stores/reflections.js'
import { MOOD_FACES, moodFace, rateActivity } from '@/stores/activityMoods'
import { moodLists } from '@/utils/profile'
import { categoryColor, categoryEmoji } from '@/utils/activityStyle'

const open = ref(false)
const editing = ref(null) // activityId of a rated row being changed
const justRated = ref(null)

const lists = computed(() => moodLists(game.completed, reflections.entries))
const insight = computed(() => moodInsight())
const strip = computed(() => lists.value.rated.slice(0, 6))

const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

function rate(activity, mood) {
  rateActivity(activity, mood)
  justRated.value = activity.activityId ?? activity.id
  editing.value = null
  setTimeout(() => (justRated.value = null), 900)
}

function openSheet() {
  editing.value = null
  open.value = true
}
</script>

<template>
  <section class="gol-card moods-card">
    <div class="d-flex align-items-center gap-3">
      <button class="head-btn d-flex align-items-center gap-3 flex-grow-1" @click="openSheet">
        <span class="gol-icon-tile tile-coral"><i class="bi bi-emoji-smile"></i></span>
        <span class="text-start min-w-0">
          <span class="d-block card-title">Activity moods</span>
          <span class="d-block subtitle">{{ insight }}</span>
        </span>
      </button>
      <button v-if="lists.toRate.length" class="gol-btn-coral" data-testid="moods-to-rate" @click="openSheet">
        {{ lists.toRate.length }} to rate
      </button>
      <button v-else class="gol-btn-soft" @click="openSheet">View</button>
    </div>

    <div v-if="strip.length" class="d-flex gap-2 mt-3 flex-wrap" aria-label="Recent moods">
      <span v-for="r in strip" :key="r.id" class="strip-face" :title="r.activityTitle + ': ' + moodFace(r.mood).label">
        {{ moodFace(r.mood).emoji }}
      </span>
    </div>

    <BottomSheet :open="open" label="Activity moods" @close="open = false">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <p class="gol-eyebrow">Only you can see this</p>
          <h2 class="gol-title">Activity moods</h2>
        </div>
        <button class="gol-close" aria-label="Close" @click="open = false"><i class="bi bi-x-lg"></i></button>
      </div>

      <!-- To rate -->
      <template v-if="lists.toRate.length">
        <h3 class="section-label">How did it feel? <span class="count">{{ lists.toRate.length }}</span></h3>
        <TransitionGroup tag="ul" name="mood-row" class="list-unstyled d-grid gap-2 mb-4">
          <li v-for="a in lists.toRate" :key="a.id" class="mood-row" data-testid="to-rate-row">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="row-emoji" :style="{ background: categoryColor(a.category) }">{{ categoryEmoji(a.category) }}</span>
              <div class="min-w-0">
                <div class="row-title">{{ a.title }}</div>
                <div class="row-meta">Done {{ shortDate(a.date) }}</div>
              </div>
            </div>
            <div class="faces" role="group" :aria-label="'Rate ' + a.title">
              <button v-for="m in MOOD_FACES" :key="m.value" class="face-btn" :aria-label="m.label" @click="rate(a, m.value)">
                <span class="face-emoji">{{ m.emoji }}</span>
                <span class="face-label">{{ m.label }}</span>
              </button>
            </div>
          </li>
        </TransitionGroup>
      </template>
      <p v-else class="all-done mb-4"><i class="bi bi-check2-circle"></i> All caught up. Nice!</p>

      <!-- Rated -->
      <h3 class="section-label">Rated</h3>
      <ul v-if="lists.rated.length" class="list-unstyled d-grid gap-2 mb-0">
        <li v-for="r in lists.rated" :key="r.id" class="mood-row" :class="{ pop: justRated === r.activityId }">
          <div class="d-flex align-items-center gap-2">
            <span class="row-emoji" :style="{ background: categoryColor(r.category) }">{{ categoryEmoji(r.category) }}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="row-title">{{ r.activityTitle }}</div>
              <div class="row-meta">{{ shortDate(r.date) }} · {{ moodFace(r.mood).label }}</div>
            </div>
            <button
              class="rated-face"
              :aria-label="'Change mood for ' + r.activityTitle"
              :aria-expanded="editing === r.activityId"
              @click="editing = editing === r.activityId ? null : r.activityId"
            >
              {{ moodFace(r.mood).emoji }}
            </button>
          </div>
          <p v-if="r.note" class="row-note mb-0 mt-2">“{{ r.note }}”</p>
          <div v-if="editing === r.activityId" class="faces mt-2" role="group" :aria-label="'Change mood for ' + r.activityTitle">
            <button
              v-for="m in MOOD_FACES"
              :key="m.value"
              class="face-btn"
              :class="{ on: m.value === r.mood }"
              :aria-label="m.label"
              :aria-pressed="m.value === r.mood"
              @click="rate(r, m.value)"
            >
              <span class="face-emoji">{{ m.emoji }}</span>
              <span class="face-label">{{ m.label }}</span>
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="row-meta">Nothing rated yet. Your ratings help us suggest what to do next.</p>
    </BottomSheet>
  </section>
</template>

<style scoped>
.min-w-0 { min-width: 0; }
.moods-card { font-family: var(--gol-font); color: var(--gol-ink); }
.head-btn { background: none; border: none; padding: 0; color: inherit; font-family: inherit; min-width: 0; }
.tile-coral { background: var(--gol-coral); }
.card-title { font-weight: 900; font-size: 1rem; }
.subtitle { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); line-height: 1.3; }
.strip-face {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--gol-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.section-label { font-weight: 900; font-size: 1rem; margin-bottom: 0.6rem; }
.count {
  display: inline-block;
  min-width: 1.5rem;
  border-radius: 999px;
  background: var(--gol-coral);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.1rem 0.45rem;
  text-align: center;
  vertical-align: middle;
}
.mood-row {
  background: #fff;
  border-radius: 18px;
  padding: 0.75rem 0.85rem;
  box-shadow: 0 3px 0 var(--gol-card-edge);
}
.mood-row.pop { animation: pop 0.6s ease; }
@keyframes pop {
  30% { transform: scale(1.03); background: var(--gol-good-zone); }
}
.row-emoji {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.row-title { font-weight: 800; line-height: 1.25; }
.row-meta { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); }
.row-note { font-size: 0.85rem; color: var(--gol-muted); font-style: italic; }

.faces { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; }
.face-btn {
  border: 2px solid transparent;
  background: var(--gol-bg);
  border-radius: 14px;
  padding: 0.4rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--gol-font);
  color: var(--gol-ink);
  transition: transform 0.12s, border-color 0.12s;
}
.face-btn:hover { transform: translateY(-2px) scale(1.05); border-color: var(--gol-purple-soft); }
.face-btn:active { transform: scale(0.95); }
.face-btn.on { border-color: var(--gol-purple); background: var(--gol-purple-soft); }
.face-emoji { font-size: 1.6rem; line-height: 1.2; }
.face-label { font-size: 0.7rem; font-weight: 800; }
.rated-face {
  font-size: 1.7rem;
  border: none;
  background: var(--gol-bg);
  border-radius: 14px;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}
.all-done { font-weight: 800; color: var(--gol-teal); }

.mood-row-leave-active { transition: opacity 0.25s, transform 0.25s; }
.mood-row-leave-to { opacity: 0; transform: translateY(-10px) scale(0.97); }
.mood-row-move { transition: transform 0.25s; }
</style>
