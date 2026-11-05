// =============================================================
// Profile page helpers: plain functions, no Firebase, so they are easy to test
// (src/__tests__/profile.spec.js). The Firestore calls live in src/services/profile.js.
// =============================================================
import { statusOf, myRole } from '@/utils/openjio'

export const NAME_MAX = 40

/** Returns a problem to show the user, or '' if the name is fine. */
export function validateDisplayName(name) {
  const n = (name ?? '').trim()
  if (!n) return 'Your name can’t be empty.'
  if (n.length > NAME_MAX) return `Keep it under ${NAME_MAX} characters.`
  return ''
}

/** "enmin.seah.2025@smu.edu.sg" -> "@enmin.seah.2025" */
export const handleFor = (email) => (email ? '@' + email.split('@')[0] : '')

/** "En Min Seah" -> "EM" (shown when there is no profile picture) */
export function initialsFor(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return (parts.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase()
}

/** "En Min Seah" -> "En". Used in "Looking good, En". */
export const firstName = (name) => (name ?? '').trim().split(/\s+/)[0] || 'you'

// ---------- Lists on the profile ----------

/** Saved activity ids -> the activities (skips ones that no longer exist). */
export function savedActivities(savedIds = [], findActivity) {
  return savedIds.map((id) => findActivity(id)).filter(Boolean)
}

/**
 * "My plans": OPENJIOs the user hosts, is going to or is queued for.
 * Ended, cancelled and already-checked-in ones are left out. Soonest first:
 *   { key, id, title, category, when (ms), kind: 'jio', role, to }
 */
export function buildPlans({ jios = [], uid, completedIds = [], now = new Date() }) {
  const done = new Set(completedIds)
  return jios
    .filter((j) => myRole(j, uid) !== 'none' && !['ended', 'cancelled'].includes(statusOf(j, now)))
    .filter((j) => !done.has(`jio-${j.id}`))
    .map((j) => ({
      key: 'j-' + j.id,
      id: j.id,
      title: j.title,
      category: j.category,
      when: j.startAt.getTime(),
      kind: 'jio',
      role: myRole(j, uid),
      to: '/activities?view=openJio',
    }))
    .sort((x, y) => x.when - y.when)
}

/** Completed activities, newest first. */
export const completedNewestFirst = (completed = []) =>
  [...completed].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

// ---------- Wellbeing suggestions ("Keep the energy going") ----------

/**
 * Picks up to `n` activities to suggest after a wellbeing check-in.
 * Doing well -> things they're into, any energy. Running low -> calm, gentle ones.
 */
export function wellbeingSuggestions(score, activities = [], interests = [], n = 2) {
  const low = score < 50
  const calmCats = ['wellness', 'arts', 'outdoors', 'games']
  const rank = (a) => {
    let s = 0
    if (interests.includes(a.category)) s += 2
    if (low) {
      if (a.energyLevel === 'low') s += 3
      if (calmCats.includes(a.category)) s += 1
      if (a.energyLevel === 'high') s -= 3
    } else if (a.energyLevel === 'medium' || a.energyLevel === 'high') s += 1
    if (a.cost === 0) s += 1
    return s
  }
  const seen = new Set()
  return activities
    .filter((a) => a?.id && a.title)
    .map((a) => ({ a, s: rank(a) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a)
    .filter((a) => !seen.has(a.title) && seen.add(a.title)) // one card per repeating event
    .slice(0, n)
}
