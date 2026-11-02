// =============================================================
// Activity moods (Profile page): rate each completed activity with an emoji.
// Uses the same mood scale and storage as stores/reflections.js, so the
// "How was it?" prompt, the mood insight and moodSuggestions.js all see
// these ratings too. Private: only the user sees them, and no points
// are given for rating (same rule as reflections, avoids "reward bias").
// =============================================================
import { reflections, saveReflection, MOODS } from './reflections.js'

// Emoji faces for the 1–4 mood scale in reflections.js
const EMOJI = { 1: '😩', 2: '😐', 3: '🙂', 4: '🤩' }

export const MOOD_FACES = MOODS.map((m) => ({ ...m, emoji: EMOJI[m.value] }))
export const moodFace = (value) => MOOD_FACES.find((m) => m.value === value) || null

/** Mood (1–4) the user gave this activity, or null. */
export function moodFor(activityId) {
  const entry = reflections.entries.findLast((e) => e.activityId === activityId && e.mood)
  return entry ? entry.mood : null
}

/**
 * Rate (or re-rate) a completed activity.
 *   activity = an item from game.completed: { id, title, category, energy }
 *           or a reflection entry:          { activityId, activityTitle, category, energy }
 */
export function rateActivity(activity, mood) {
  if (!moodFace(mood)) throw new Error('Pick a mood.')
  const activityId = activity.activityId ?? activity.id
  const existing = reflections.entries.findLast((e) => e.activityId === activityId)
  if (existing) {
    existing.mood = mood
    // Clear any "How was it?" prompt still waiting for this one
    const i = reflections.pending.findIndex((p) => p.activityId === activityId)
    if (i !== -1) reflections.pending.splice(i, 1)
    return existing
  }
  return saveReflection(
    {
      activityId,
      activityTitle: activity.activityTitle ?? activity.title,
      category: activity.category,
      energy: activity.energy ?? null,
    },
    mood,
    '',
  )
}
