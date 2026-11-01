// Small helpers for Friends & notifications. No Firebase here, so they are easy to test.

const HOUR = 3600000

/** One id per pair of people, the same whoever sent the request: "uidA_uidB" (sorted). */
export function pairId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/** The other person in a friendship doc. */
export function otherMember(friendship, myUid) {
  return friendship.members.find((m) => m !== myUid)
}

/** Drop free-time windows that have already ended, and sort the rest by start time. */
export function upcomingWindows(windows = [], now = Date.now()) {
  return windows.filter((w) => w.end > now).sort((a, b) => a.start - b.start)
}

/**
 * Times when both people are free (each overlap at least `minHrs` long).
 * windows are { start, end } in milliseconds.
 */
export function overlaps(mine = [], theirs = [], { now = Date.now(), minHrs = 1 } = {}) {
  const result = []
  for (const a of upcomingWindows(mine, now)) {
    for (const b of upcomingWindows(theirs, now)) {
      const start = Math.max(a.start, b.start, now)
      const end = Math.min(a.end, b.end)
      if (end - start >= minHrs * HOUR) result.push({ start, end })
    }
  }
  return result.sort((x, y) => x.start - y.start)
}

/** "Sat 14 Nov, 2pm–5pm" */
export function formatWindow({ start, end }) {
  const s = new Date(start)
  const e = new Date(end)
  const day = s.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = (d) =>
    d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined, hour12: true })
      .replace(' ', '')
      .toLowerCase()
  const sameDay = s.toDateString() === e.toDateString()
  return sameDay ? `${day}, ${time(s)}–${time(e)}` : `${day} ${time(s)} – ${e.toLocaleDateString('en-SG', { weekday: 'short' })} ${time(e)}`
}

/** "just now", "5m ago", "3h ago", "2d ago" */
export function timeAgo(ms, now = Date.now()) {
  const mins = Math.floor((now - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/** Firestore Timestamp, number or null → milliseconds (null while the server time is pending). */
export function toMillis(t) {
  if (!t) return Date.now()
  if (typeof t === 'number') return t
  return t.toMillis?.() ?? Date.now()
}

/** First letter(s) for the avatar circle when there's no photo. */
export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}
