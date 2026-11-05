export const UNIVERSITIES = [
  { id: 'smu', name: 'SMU', domains: ['smu.edu.sg'], allowSubdomains: true },
  { id: 'nus', name: 'NUS', domains: ['u.nus.edu'] },
  { id: 'ntu', name: 'NTU', domains: ['e.ntu.edu.sg'] },
  { id: 'sutd', name: 'SUTD', domains: ['mymail.sutd.edu.sg'] },
  { id: 'sit', name: 'SIT', domains: ['sit.singaporetech.edu.sg'] },
  { id: 'suss', name: 'SUSS', domains: ['suss.edu.sg'] },
]

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normaliseEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

export function getDomain(email) {
  const e = normaliseEmail(email)
  const at = e.lastIndexOf('@')
  return at === -1 ? '' : e.slice(at + 1)
}

function domainMatches(domain, allowed, university) {
  if (domain === allowed) return true
  return Boolean(university.allowSubdomains) && domain.endsWith(`.${allowed}`)
}

export function getUniversity(email) {
  const e = normaliseEmail(email)
  if (!EMAIL_SHAPE.test(e)) return null
  const domain = getDomain(e)
  return UNIVERSITIES.find((u) => u.domains.some((d) => domainMatches(domain, d, u))) ?? null
}

export function isSchoolEmail(email) {
  return getUniversity(email) !== null
}

export const ALLOWED_DOMAINS_TEXT = UNIVERSITIES.flatMap((u) => u.domains).join(', ')
