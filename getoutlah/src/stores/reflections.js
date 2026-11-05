
import { reactive } from 'vue'
import { registerUserStore } from './userData.js'


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

function emptyState() {
  return { pending: [], entries: [], promptsOn: true, dismissed: [] }
}

export const reflections = reactive(emptyState())
registerUserStore('reflections', reflections, emptyState)

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

export function updateReflection(id, mood, note) {
  const entry = reflections.entries.find((e) => e.id === id)
  if (!entry) return null
  entry.mood = mood || null
  entry.note = (note || '').trim()
  entry.editedOn = today()
  return entry
}

export function deleteReflection(id) {
  const i = reflections.entries.findIndex((e) => e.id === id)
  if (i !== -1) reflections.entries.splice(i, 1)
}

export function skipReflection(pendingItem) {
  removePending(pendingItem.activityId)
}

function removePending(activityId) {
  const i = reflections.pending.findIndex((p) => p.activityId === activityId)
  if (i !== -1) reflections.pending.splice(i, 1)
  const d = reflections.dismissed.indexOf(activityId)
  if (d !== -1) reflections.dismissed.splice(d, 1)
}

export function dismissPrompt(activityId) {
  if (!reflections.dismissed.includes(activityId)) reflections.dismissed.push(activityId)
}

export function setPromptsOn(on) {
  reflections.promptsOn = Boolean(on)
}

export function resetReflections() {
  Object.assign(reflections, emptyState())
}

export function recentReflections(n = 3) {
  return [...reflections.entries].reverse().slice(0, n)
}

export function latestReflection() {
  return reflections.entries.length ? reflections.entries[reflections.entries.length - 1] : null
}

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

export function moodInsight() {
  const byCat = moodByCategory()
  const cats = Object.keys(byCat)
  if (reflections.entries.filter((e) => e.mood).length < 3 || !cats.length) {
    return 'Rate a few activities and we will spot what makes you feel good.'
  }
  const best = cats.sort((a, b) => byCat[b] - byCat[a])[0]
  return `You tend to feel best after ${best} activities.`
}
