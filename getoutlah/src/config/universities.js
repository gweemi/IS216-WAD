// Which email domains count as a "school email".
//
// Only STUDENT domains are listed, and a domain must match EXACTLY
// (so "smu.edu.sg.fake.com" or "staff.smu.edu.sg" are rejected).
//
// IMPORTANT: if you add or remove a domain here, update the same list in
// firestore.rules too, so the database enforces the same rule as the form.
// Double-check each domain with a real student from that university.
export const UNIVERSITIES = [
  { id: 'smu', name: 'SMU', domains: ['smu.edu.sg'] },
  { id: 'nus', name: 'NUS', domains: ['u.nus.edu'] },
  { id: 'ntu', name: 'NTU', domains: ['e.ntu.edu.sg'] },
  { id: 'sutd', name: 'SUTD', domains: ['mymail.sutd.edu.sg'] },
  { id: 'sit', name: 'SIT', domains: ['sit.singaporetech.edu.sg'] },
  { id: 'suss', name: 'SUSS', domains: ['suss.edu.sg'] },
]

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim spaces and lowercase, so " Alicia@SMU.edu.sg " works. */
export function normaliseEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

/** The part after "@", or '' if the email has no "@". */
export function getDomain(email) {
  const e = normaliseEmail(email)
  const at = e.lastIndexOf('@')
  return at === -1 ? '' : e.slice(at + 1)
}

/** Returns the university object for a school email, or null. */
export function getUniversity(email) {
  const e = normaliseEmail(email)
  if (!EMAIL_SHAPE.test(e)) return null
  const domain = getDomain(e)
  return UNIVERSITIES.find((u) => u.domains.includes(domain)) ?? null
}

export function isSchoolEmail(email) {
  return getUniversity(email) !== null
}

/** Human-readable list for hints, e.g. "smu.edu.sg, u.nus.edu, ..." */
export const ALLOWED_DOMAINS_TEXT = UNIVERSITIES.flatMap((u) => u.domains).join(', ')
