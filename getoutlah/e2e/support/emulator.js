const PROJECT_ID = 'demo-getoutlah'
const AUTH_URL = 'http://127.0.0.1:9099'
const FIRESTORE_URL = `http://127.0.0.1:8081/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export const SMU_SCIS_1 = { latitude: 1.29733, longitude: 103.84942 }

export const CAMPUS_ACTIVITY = {
  id: 'e2e-scis-lawn-walk',
  title: 'SCIS Lawn Walk',
  lat: 1.2975,
  lng: 103.8496,
}

export const makeRunId = (testInfo) =>
  `${testInfo.project.name}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'object') return { mapValue: { fields: toFields(value) } }
  return { stringValue: String(value) }
}

const toFields = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toValue(value)]))

async function check(response, what) {
  if (!response.ok) throw new Error(`${what} failed (${response.status}): ${await response.text()}`)
  return response.json()
}

export async function setDocument(path, data) {
  const response = await fetch(`${FIRESTORE_URL}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  })
  return check(response, `Writing ${path}`)
}

export async function createGoogleUser({ email, name }) {
  const idToken = JSON.stringify({ sub: email, email, email_verified: true, name })
  const response = await fetch(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnSecureToken: true,
    }),
  })
  const { localId } = await check(response, `Creating ${email}`)
  return localId
}

export async function seedStudent(runId, label) {
  const student = { name: `Test ${label} ${runId}`, email: `${label.toLowerCase()}-${runId}@e2e.test` }
  student.uid = await createGoogleUser(student)
  await setDocument(`users/${student.uid}`, {
    displayName: student.name,
    email: student.email,
    photoURL: null,
    universityId: null,
    universityName: null,
    points: 0,
    createdAt: new Date(),
    preferences: { interests: ['outdoors', 'games'], maxBudget: null, energyLevel: 'medium', groupPreference: 'either' },
    preferencesVersion: 2,
  })
  return student
}

export async function makeFriends(a, b) {
  const members = [a.uid, b.uid].sort()
  await setDocument(`friendships/${members.join('_')}`, {
    members,
    requestedBy: b.uid,
    status: 'accepted',
    names: { [a.uid]: a.name, [b.uid]: b.name },
    photos: { [a.uid]: null, [b.uid]: null },
    createdAt: new Date(),
  })
}

export async function seedJio(host, { id, title, ...overrides }) {
  const start = new Date(Date.now() + 86400000)
  start.setHours(19, 0, 0, 0)
  await setDocument(`openjios/${id}`, {
    title,
    category: 'games',
    description: 'Bring snacks!',
    location: 'East Coast Park',
    region: 'east',
    lat: 1.3008,
    lng: 103.9122,
    startAt: start,
    durationMins: 120,
    cost: 0,
    capacity: 6,
    visibility: 'public',
    hostId: host.uid,
    hostName: host.name,
    participants: [host.uid],
    waitlist: [],
    invited: [],
    status: 'open',
    createdAt: new Date(),
    ...overrides,
  })
  return { id, title, activityId: `jio-${id}` }
}

export async function seedPick({ id, title, ...overrides }) {
  await setDocument(`getoutlahPicks/${id}`, {
    title,
    description: 'Seeded for end-to-end tests.',
    category: 'outdoors',
    cost: 0,
    durationHrs: 1,
    setting: 'Outdoor',
    energyLevel: 'low',
    groupFriendly: true,
    area: 'Woodlands',
    region: 'north',
    lat: 1.436,
    lng: 103.7865,
    url: null,
    imageUrl: null,
    source: 'getoutlahPicks',
    ...overrides,
  })
  return { id, title }
}

export async function seedJourney(runId) {
  const me = await seedStudent(runId, 'Student')
  const friend = await seedStudent(runId, 'Friend')
  await makeFriends(me, friend)
  const friendJio = await seedJio(friend, {
    id: `e2e-friend-jio-${runId}`,
    title: `Board games ${runId}`,
    visibility: 'friends_only',
  })
  await seedPick({
    id: CAMPUS_ACTIVITY.id,
    title: CAMPUS_ACTIVITY.title,
    description: 'A short walk around the SCIS 1 lawn.',
    area: 'Bras Basah',
    region: 'central',
    lat: CAMPUS_ACTIVITY.lat,
    lng: CAMPUS_ACTIVITY.lng,
  })
  return { me, friend, friendJio }
}
