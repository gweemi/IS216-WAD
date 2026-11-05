
import { reactive } from 'vue'
import { registerUserStore } from './userData.js'

export const CHECKIN_INTERVAL_DAYS = 14

// The 5 official WHO-5 statements, from google
export const WHO5_QUESTIONS = [
  'I have felt cheerful and in good spirits',
  'I have felt calm and relaxed',
  'I have felt active and vigorous',
  'I woke up feeling fresh and rested',
  'My daily life has been filled with things that interest me',
]

// 5 = best
export const WHO5_OPTIONS = [
  { value: 5, label: 'All of the time' },
  { value: 4, label: 'Most of the time' },
  { value: 3, label: 'More than half of the time' },
  { value: 2, label: 'Less than half of the time' },
  { value: 1, label: 'Some of the time' },
  { value: 0, label: 'At no time' },
]

// to calculate their score (0–25) × 4 = score out of 100
export function who5Score(answers) {
  return answers.reduce((sum, a) => sum + a, 0) * 4
}

export function statusFor(score) {
  if (score >= 70) return { label: 'Doing well', tone: 'good' }
  if (score >= 50) return { label: 'Doing okay', tone: 'okay' }
  if (score > 28) return { label: 'Running low', tone: 'low' }
  return { label: 'Having a hard time', tone: 'support' }
}

// Each account has its own check-ins, saved to Firestore so they show on every device.
// (src/stores/userData.js + src/services/userDataSync.js). Only the owner can read them.
export const wellbeing = reactive({ history: [] })
registerUserStore('wellbeing', wellbeing, () => ({ history: [] }))

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

export function saveCheckIn(answers) {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const entry = { date, score: who5Score(answers) }

  const last = latestCheckIn()
  if (last && last.date === date) wellbeing.history.splice(-1, 1, entry)
  else wellbeing.history.push(entry)
  return entry
}

export function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
