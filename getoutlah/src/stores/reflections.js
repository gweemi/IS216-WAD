// =============================================================
// GetOutLah! — Post-activity mood reflections (Wellbeing 6c)
//   import { reflections, saveReflection } from '../stores/reflections.js'
// PRIVATE: moods and notes are only ever shown to the user.
// No points are given for reflecting (avoids "reward bias").
// =============================================================
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'gol-reflections-v1'
const USE_DEMO_DATA = true

// Mood scale 1–4 (from the draft)
export const MOODS = [
  { value: 1, label: 'Drained', icon: 'bi-emoji-frown', color: 'coral' },
  { value: 2, label: 'Meh', icon: 'bi-emoji-neutral', color: 'yellow' },
  { value: 3, label: 'Good', icon: 'bi-emoji-smile', color: 'cyan' },
  { value: 4, label: 'Buzzing', icon: 'bi-emoji-laughing', color: 'lime' },
]

export function moodInfo(value) {
  return MOODS.find((m) => m.value === value) || null
}

function today(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// promptsOn: show the "How was it?" banner after check-ins (Settings switch)
// dismissed: activities whose banner the user closed with ✕ (remembered)
function emptyState() {
  return { pending: [], entries: [], promptsOn: true, dismissed: [] }
}

// Matches the demo activities in gamification.js
function demoState() {
  return {
    ...emptyState(),
    entries: [
      { id: 'r1', activityId: 'demo-1', activityTitle: 'Pottery taster class', category: 'workshops', energy: 'calm', date: today(-28), mood: 3, note: 'Messy but so relaxing. Made a wonky bowl.' },
      { id: 'r2', activityId: 'demo-2', activityTitle: 'Badminton OPENJIO', category: 'sports', energy: 'high', date: today(-21), mood: 4, note: 'Met 3 new people from SCIS!' },
      { id: 'r3', activityId: 'demo-3', activityTitle: 'MacRitchie TreeTop Walk', category: 'outdoors', energy: 'moderate', date: today(-14), mood: 4, note: '' },
      { id: 'r4', activityId: 'demo-4', activityTitle: 'East Coast picnic (hosted)', category: 'outdoors', energy: 'moderate', date: today(-7), mood: 3, note: 'Hosting was stressful at first but fun.' },
      { id: 'r5', activityId: 'demo-5', activityTitle: 'Art jam at Jurong', category: 'arts', energy: 'calm', date: today(0), mood: 2, note: 'Tired after a long week.' },
    ],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...JSON.parse(raw) }
  } catch (e) {
    /* ignore */
  }
  return USE_DEMO_DATA ? demoState() : emptyState()
}

export const reflections = reactive(load())

watch(
  reflections,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      /* ignore */
    }
  },
  { deep: true }
)

// Called automatically after a successful check-in (see gamification.js)
export function addPendingReflection(activity) {
  if (reflections.pending.some((p) => p.activityId === activity.id)) return
  if (reflections.entries.some((e) => e.activityId === activity.id)) return
  reflections.pending.push({
    activityId: activity.id,
    activityTitle: activity.title,
    category: activity.category,
    energy: activity.energy || ({ low: 'calm', medium: 'moderate', high: 'high' }[activity.energyLevel]) || null,
    checkedInAt: new Date().toISOString(),
  })
}

// Save a reflection. mood (1–4) and note are both optional.
export function saveReflection(pendingItem, mood, note) {
  const entry = {
    id: 'r-' + Date.now(),
    activityId: pendingItem.activityId,
    activityTitle: pendingItem.activityTitle,
    category: pendingItem.category,
    energy: pendingItem.energy,
    date: today(),
    mood: mood || null,
    note: (note || '').trim(),
  }
  reflections.entries.push(entry)
  removePending(pendingItem.activityId)
  return entry
}

// "Skip": the user doesn't want to reflect on this one
export function skipReflection(pendingItem) {
  removePending(pendingItem.activityId)
}

function removePending(activityId) {
  const i = reflections.pending.findIndex((p) => p.activityId === activityId)
  if (i !== -1) reflections.pending.splice(i, 1)
  const d = reflections.dismissed.indexOf(activityId)
  if (d !== -1) reflections.dismissed.splice(d, 1)
}

// ✕ on the banner: hide it for this activity (remembered after refresh).
// The activity stays in "My reflections" in case they change their mind.
export function dismissPrompt(activityId) {
  if (!reflections.dismissed.includes(activityId)) reflections.dismissed.push(activityId)
}

// Settings switch: turn the "How was it?" banner on/off
export function setPromptsOn(on) {
  reflections.promptsOn = Boolean(on)
}

// Wipes all reflections (used by the test page)
export function resetReflections() {
  Object.assign(reflections, emptyState())
}

export function recentReflections(n = 3) {
  return [...reflections.entries].reverse().slice(0, n)
}

export function latestReflection() {
  return reflections.entries.length ? reflections.entries[reflections.entries.length - 1] : null
}

// Average mood for each category the user has rated, e.g. { outdoors: 4, arts: 2 }
export function moodByCategory() {
  const sums = {}
  for (const e of reflections.entries) {
    if (!e.mood || !e.category) continue
    sums[e.category] = sums[e.category] || { total: 0, count: 0 }
    sums[e.category].total += e.mood
    sums[e.category].count += 1
  }
  const result = {}
  for (const [cat, s] of Object.entries(sums)) result[cat] = s.total / s.count
  return result
}

// A friendly one-liner like "You tend to feel best after outdoors activities"
export function moodInsight() {
  const byCat = moodByCategory()
  const cats = Object.keys(byCat)
  if (reflections.entries.filter((e) => e.mood).length < 3 || !cats.length) {
    return 'Rate a few activities and we will spot what makes you feel good.'
  }
  const best = cats.sort((a, b) => byCat[b] - byCat[a])[0]
  return `You tend to feel best after ${best} activities.`
}
