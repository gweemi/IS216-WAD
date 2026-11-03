// =============================================================
// Reports: plain functions, no Firebase, so they are easy to test
// (src/__tests__/reports.spec.js). The Firestore calls live in
// src/services/api/reports.js.
//
// Where things are stored:
//   reports/{jioId}_{reporterId}   one report (one per person per jio)
//   openjios/{id}.status           'suspended' while a report is waiting for an admin
//   users/{uid}.suspendedUntil     the host can't use OPENJIO until this date
//   users/{uid}.banned             true = the host can't use OPENJIO at all
// =============================================================
import { REPORT_REASONS } from '@/config/reportReasons'

export const SUSPENSION_DAYS = 30
export const DETAILS_MAX = 250
const DAY_MS = 24 * 60 * 60 * 1000

/** Each person can report a jio once, so the report's id is made from both. */
export const reportId = (jioId, reporterId) => `${jioId}_${reporterId}`

/** The reason's label, e.g. 'scam' → 'Scam, or asks for payment outside the app'. */
export function reasonLabel(id) {
  const reason = REPORT_REASONS.find((r) => r.id === id)
  if (!reason) {
    return 'Other' // e.g. an old reason that was removed from the list
  }
  return reason.label
}

/** Returns a list of problems with the report form ([] means it's fine). */
export function validateReport(form) {
  const problems = []
  if (!form) {
    return ['Pick a reason.']
  }
  const reason = REPORT_REASONS.find((r) => r.id === form.reason)
  const details = (form.details || '').trim()

  if (!reason) {
    problems.push('Pick a reason.')
  }
  else if (reason.needsDetails && !details) {
    problems.push('Tell us what is wrong.')
  }
  if (details.length > DETAILS_MAX) {
    problems.push(`Keep the details under ${DETAILS_MAX} characters.`)
  }
  return problems
}

/** The date a suspension that starts now would end. */
export function suspensionEnd(now = new Date()) {
  return new Date(now.getTime() + SUSPENSION_DAYS * DAY_MS)
}

// Firestore gives back Timestamps; tests and the app may also pass Dates or numbers.
function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

/**
 * Is this user's account restricted?
 * Returns null (fine), { type: 'banned' } or { type: 'suspended', until: Date }.
 */
export function accountRestriction(profile, now = new Date()) {
  if (!profile) {
    return null
  }
  if (profile.banned === true) {
    return { type: 'banned' }
  }
  const until = toDate(profile.suspendedUntil)
  if (until && until > now) {
    return { type: 'suspended', until }
  }
  return null
}

/**
 * What to show under a disabled "Start a jio" button, or null if the user can start jios.
 * Returns { title, detail }, e.g.
 *   { title: 'You are suspended for 30 days.', detail: 'Suspension lifted: 3 Dec 2026, 2:15 pm' }
 */
export function startJioNotice(restriction) {
  if (!restriction) {
    return null
  }
  if (restriction.type === 'banned') {
    return { title: 'You are banned from starting OPENJIOs.', detail: '' }
  }
  const liftedAt = restriction.until.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })
  return { title: `You are suspended for ${SUSPENSION_DAYS} days.`, detail: `Suspension lifted: ${liftedAt}` }
}

export function restrictionMessage(restriction) {
  if (!restriction) return ''
  if (restriction.type === 'banned') {
    return 'Your account has been banned from OPENJIO.'
  }
  const date = restriction.until.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  return `Your account is suspended from OPENJIO until ${date}.` 
}

export function groupReportsByJio(reports) {
  const byJio = new Map()
  for (const r of reports) {
    if (!byJio.has(r.jioId)) {
      byJio.set(r.jioId, { jioId: r.jioId, jioTitle: r.jioTitle, hostId: r.hostId, hostName: r.hostName, reports: [] })
    }
    byJio.get(r.jioId).reports.push(r)
  }
  return [...byJio.values()].sort((a, b) => newestReportTime(b) - newestReportTime(a))
}


function newestReportTime(group) {
  let newest = 0
  for (const r of group.reports) {
    const date = toDate(r.createdAt)
    if (date && date.getTime() > newest) {
      newest = date.getTime()
    }
  }
  return newest
}
