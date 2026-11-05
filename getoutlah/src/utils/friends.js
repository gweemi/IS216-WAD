// Small helpers for Friends & notifications. No Firebase here, so they are easy to test.

/** One id per pair of people, the same whoever sent the request: "uidA_uidB" (sorted). */
export function pairId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/** The other person in a friendship doc. */
export function otherMember(friendship, myUid) {
  return friendship.members.find((m) => m !== myUid)
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
