import { REPORT_REASONS } from '@/config/reportReasons'

export const SUSPENSION_DAYS = 30
export const DETAILS_MAX = 250
const DAY_MS = 24 * 60 * 60 * 1000

export const reportId = (jioId, reporterId) => `${jioId}_${reporterId}`

export function reasonLabel(id) {
  const reason = REPORT_REASONS.find((r) => r.id === id)
  if (!reason) {
    return 'Other'
  }
  return reason.label
}

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

export function suspensionEnd(now = new Date()) {
  return new Date(now.getTime() + SUSPENSION_DAYS * DAY_MS)
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

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
