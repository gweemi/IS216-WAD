import { describe, it, expect } from 'vitest'
import { isSchoolEmail, getUniversity, normaliseEmail } from '@/config/universities'

describe('school email check', () => {
  it.each([
    'alicia.tan.2025@smu.edu.sg',
    'e1234567@u.nus.edu',
    'ben001@e.ntu.edu.sg',
    'chloe_lim@mymail.sutd.edu.sg',
    '2401234@sit.singaporetech.edu.sg',
    'daniel@suss.edu.sg',
  ])('accepts %s', (email) => {
    expect(isSchoolEmail(email)).toBe(true)
  })

  it.each([
    'alicia@gmail.com',
    'prof@nus.edu.sg', // staff domain, not student
    'someone@staff.smu.edu.sg', // subdomain not on the list
    'trick@smu.edu.sg.evil.com', // lookalike
    'smu.edu.sg', // no @
    'two@@smu.edu.sg',
    'has space@smu.edu.sg',
    '',
    null,
  ])('rejects %s', (email) => {
    expect(isSchoolEmail(email)).toBe(false)
  })

  it('ignores capitals and surrounding spaces', () => {
    expect(normaliseEmail('  Alicia@SMU.edu.SG ')).toBe('alicia@smu.edu.sg')
    expect(getUniversity('  Alicia@SMU.edu.SG ')?.id).toBe('smu')
  })

  it('identifies the university', () => {
    expect(getUniversity('e1234567@u.nus.edu')?.name).toBe('NUS')
  })
})
