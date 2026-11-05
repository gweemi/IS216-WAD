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

const profile = (name, email) => ({
  displayName: name,
  email,
  photoURL: null,
  universityId: null,
  universityName: null,
  points: 0,
  createdAt: new Date(),
  preferences: { interests: ['outdoors', 'games'], maxBudget: null, energyLevel: 'medium', groupPreference: 'either' },
  preferencesVersion: 2,
})

export async function seedJourney(runId) {
  const me = { name: `Test Student ${runId}`, email: `student-${runId}@e2e.test` }
  const friend = { name: `Test Friend ${runId}`, email: `friend-${runId}@e2e.test` }
  me.uid = await createGoogleUser(me)
  friend.uid = await createGoogleUser(friend)

  await setDocument(`users/${me.uid}`, profile(me.name, me.email))
  await setDocument(`users/${friend.uid}`, profile(friend.name, friend.email))

  const members = [me.uid, friend.uid].sort()
  await setDocument(`friendships/${members.join('_')}`, {
    members,
    requestedBy: friend.uid,
    status: 'accepted',
    names: { [me.uid]: me.name, [friend.uid]: friend.name },
    photos: { [me.uid]: null, [friend.uid]: null },
    createdAt: new Date(),
  })

  const tomorrow = new Date(Date.now() + 86400000)
  tomorrow.setHours(19, 0, 0, 0)
  const friendJio = { id: `e2e-friend-jio-${runId}`, title: `Board games ${runId}` }
  await setDocument(`openjios/${friendJio.id}`, {
    title: friendJio.title,
    category: 'games',
    description: 'Bring snacks!',
    location: 'East Coast Park',
    region: 'east',
    lat: 1.3008,
    lng: 103.9122,
    startAt: tomorrow,
    durationMins: 120,
    cost: 0,
    capacity: 6,
    visibility: 'friends_only',
    hostId: friend.uid,
    hostName: friend.name,
    participants: [friend.uid],
    waitlist: [],
    invited: [],
    status: 'open',
    createdAt: new Date(),
  })

  await setDocument(`getoutlahPicks/${CAMPUS_ACTIVITY.id}`, {
    title: CAMPUS_ACTIVITY.title,
    description: 'A short walk around the SCIS 1 lawn.',
    category: 'outdoors',
    cost: 0,
    durationHrs: 1,
    setting: 'Outdoor',
    energyLevel: 'low',
    groupFriendly: true,
    area: 'Bras Basah',
    region: 'central',
    lat: CAMPUS_ACTIVITY.lat,
    lng: CAMPUS_ACTIVITY.lng,
    url: null,
    imageUrl: null,
    source: 'getoutlahPicks',
  })

  return { me, friend, friendJio }
}
