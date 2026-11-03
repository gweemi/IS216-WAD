// Checks the report rules (src/utils/reports.js) and how a suspended OPENJIO behaves.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { REPORT_REASONS } from '@/config/reportReasons'
import {
  reportId, reasonLabel, validateReport, suspensionEnd, accountRestriction, restrictionMessage,
  groupReportsByJio, startJioNotice, DETAILS_MAX,
} from '@/utils/reports'
import { statusOf, statusLabel, applyJoin, applyLeave } from '@/utils/openjio'

const NOW = new Date('2026-11-03T10:00:00')

describe('report form', () => {
  it('needs a reason', () => {
    expect(validateReport({ reason: '', details: '' })).toEqual(['Pick a reason.'])
    expect(validateReport({ reason: 'scam', details: '' })).toEqual([])
  })

  it('needs details only for "Something else"', () => {
    expect(validateReport({ reason: 'other', details: '  ' })).toEqual(['Tell us what is wrong.'])
    expect(validateReport({ reason: 'other', details: 'Host keeps messaging me' })).toEqual([])
  })

  it('limits how long the details can be', () => {
    expect(validateReport({ reason: 'scam', details: 'x'.repeat(DETAILS_MAX + 1) })).toHaveLength(1)
  })

  it('has a unique id for every reason, and fits the database rule (40 characters)', () => {
    const ids = REPORT_REASONS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.length <= 40)).toBe(true)
  })

  it('labels reasons, even old ones that were removed from the list', () => {
    expect(reasonLabel('dangerous')).toBe('Dangerous or unsafe activity')
    expect(reasonLabel('no-longer-exists')).toBe('Other')
  })

  it('makes one report id per person per jio', () => {
    expect(reportId('jio1', 'userA')).toBe('jio1_userA')
  })
})

describe('banned and suspended users', () => {
  it('suspends for 30 days', () => {
    expect(suspensionEnd(NOW)).toEqual(new Date('2026-12-03T10:00:00'))
  })

  it('knows who is restricted', () => {
    expect(accountRestriction({}, NOW)).toBeNull()
    expect(accountRestriction({ banned: true }, NOW)).toEqual({ type: 'banned' })
    expect(accountRestriction({ suspendedUntil: new Date('2026-11-10') }, NOW)).toEqual({ type: 'suspended', until: new Date('2026-11-10') })
    expect(accountRestriction({ suspendedUntil: new Date('2026-11-01') }, NOW)).toBeNull() // already over
  })

  it('reads Firestore Timestamps too', () => {
    const until = new Date('2026-11-10')
    expect(accountRestriction({ suspendedUntil: { toDate: () => until } }, NOW).until).toEqual(until)
  })

  it('explains the restriction', () => {
    expect(restrictionMessage(null)).toBe('')
    expect(restrictionMessage({ type: 'banned' })).toMatch(/banned/)
    expect(restrictionMessage({ type: 'suspended', until: new Date('2026-11-10') })).toMatch(/suspended .* 2026/)
  })
})

describe('admin list', () => {
  it('shows each reported jio once, newest first', () => {
    const groups = groupReportsByJio([
      { id: 'a_1', jioId: 'a', jioTitle: 'Old', createdAt: new Date('2026-11-01') },
      { id: 'b_1', jioId: 'b', jioTitle: 'New', createdAt: new Date('2026-11-03') },
      { id: 'a_2', jioId: 'a', jioTitle: 'Old', createdAt: new Date('2026-11-02') },
    ])
    expect(groups.map((g) => [g.jioTitle, g.reports.length])).toEqual([['New', 1], ['Old', 2]])
  })
})

describe('a suspended OPENJIO', () => {
  const jio = {
    status: 'suspended', hostId: 'host', visibility: 'public', capacity: 4,
    participants: ['host', 'friend'], waitlist: [], startAt: new Date('2026-11-05T10:00:00'), durationMins: 60,
  }

  it('shows as Suspended', () => {
    expect(statusOf(jio, NOW)).toBe('suspended')
    expect(statusLabel(jio, NOW)).toBe('Suspended')
  })

  it("can't be joined or left", () => {
    expect(() => applyJoin(jio, 'someone', NOW)).toThrow(/suspended/)
    expect(() => applyLeave(jio, 'friend')).toThrow(/suspended/)
  })

  it('is allowed by the database rules', () => {
    const rules = readFileSync('firestore.rules', 'utf8')
    expect(rules).toMatch(/d\.status in \['open', 'cancelled', 'suspended'\]/)
    expect(rules).toMatch(/match \/reports\/\{reportId\}/)
  })
})

describe('Start a jio notice', () => {
  it('is empty for users who can start jios', () => {
    expect(startJioNotice(null)).toBeNull()
  })

  it('shows the suspension length and when it is lifted', () => {
    const notice = startJioNotice({ type: 'suspended', until: new Date('2026-12-03T14:15:00') })
    expect(notice.title).toBe('You are suspended for 30 days.')
    expect(notice.detail).toMatch(/^Suspension lifted: .*2026/)
  })

  it('tells banned users', () => {
    expect(startJioNotice({ type: 'banned' }).title).toMatch(/banned/)
  })
})
