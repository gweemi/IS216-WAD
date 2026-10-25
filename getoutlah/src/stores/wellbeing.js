// =============================================================
// GetOutLah! — Wellbeing check-ins (WHO-5 Well-Being Index)
//   import { wellbeing, saveCheckIn } from '../stores/wellbeing.js'
// PRIVATE: scores are only ever shown to the user themselves.
// If you move this to a shared backend, make sure the database
// rules only let the owner read their own check-ins.
// =============================================================
import { reactive, watch } from 'vue'

export const CHECKIN_INTERVAL_DAYS = 14
const STORAGE_KEY = 'gol-wellbeing-v1'
const USE_DEMO_DATA = true // sample history that matches the Figma

// The 5 official WHO-5 statements ("Over the last two weeks...")
export const WHO5_QUESTIONS = [
  'I have felt cheerful and in good spirits',
  'I have felt calm and relaxed',
  'I have felt active and vigorous',
  'I woke up feeling fresh and rested',
  'My daily life has been filled with things that interest me',
]

// Answer scale, 5 = best
export const WHO5_OPTIONS = [
  { value: 5, label: 'All of the time' },
  { value: 4, label: 'Most of the time' },
  { value: 3, label: 'More than half of the time' },
  { value: 2, label: 'Less than half of the time' },
  { value: 1, label: 'Some of the time' },
  { value: 0, label: 'At no time' },
]

// Raw score (0–25) × 4 = score out of 100
export function who5Score(answers) {
  return answers.reduce((sum, a) => sum + a, 0) * 4
}

// Friendly status bands. 50 is the WHO-5 "good wellbeing" line.
export function statusFor(score) {
  if (score >= 70) return { label: 'Doing well', tone: 'good' }
  if (score >= 50) return { label: 'Doing okay', tone: 'okay' }
  if (score > 28) return { label: 'Running low', tone: 'low' }
  return { label: 'Having a hard time', tone: 'support' }
}

function demoHistory() {
  return [
    { date: '2026-04-06', score: 48 },
    { date: '2026-04-20', score: 56 },
    { date: '2026-05-04', score: 64 },
    { date: '2026-05-18', score: 60 },
  ]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return { history: USE_DEMO_DATA ? demoHistory() : [] }
}

export const wellbeing = reactive(load())

watch(
  wellbeing,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      /* ignore */
    }
  },
  { deep: true }
)

export function latestCheckIn() {
  return wellbeing.history.length ? wellbeing.history[wellbeing.history.length - 1] : null
}

export function previousCheckIn() {
  return wellbeing.history.length > 1 ? wellbeing.history[wellbeing.history.length - 2] : null
}

export function daysSinceLastCheckIn() {
  const last = latestCheckIn()
  if (!last) return Infinity
  const ms = new Date().setHours(0, 0, 0, 0) - new Date(last.date).setHours(0, 0, 0, 0)
  return Math.floor(ms / 86400000)
}

export function isCheckInDue() {
  return daysSinceLastCheckIn() >= CHECKIN_INTERVAL_DAYS
}

// Saves a finished check-in. Only the score is stored, not the answers.
export function saveCheckIn(answers) {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const entry = { date, score: who5Score(answers) }
  // Replace today's entry if they redo it on the same day
  const last = latestCheckIn()
  if (last && last.date === date) wellbeing.history.splice(-1, 1, entry)
  else wellbeing.history.push(entry)
  return entry
}

// "18 May"
export function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
