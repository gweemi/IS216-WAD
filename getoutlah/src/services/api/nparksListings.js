import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { ACTIVITY_COLLECTIONS } from '@/utils/activitySource'
import { NPARKS_CONTENT_TYPE, NPARKS_PROVIDER, isNparksRoute } from '@/utils/nparksTrails'

const externalListings = ACTIVITY_COLLECTIONS.externalListings

export async function getNparksListings() {
  const snapshot = await getDocs(collection(db, externalListings))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter(isNparksRoute)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function nparksPresentation(form) {
  const numberOrNull = (value) => value === '' || value == null ? null : Number(value)
  const title = (form.title ?? '').trim()
  const description = (form.description ?? '').trim()
  const lat = numberOrNull(form.lat), lng = numberOrNull(form.lng)
  if (!title || title.length > 120) throw new Error('Title must be between 1 and 120 characters.')
  if (description.length > 5000) throw new Error('Description must be 5,000 characters or fewer.')
  if (!['outdoors', 'sports', 'arts', 'food', 'workshops', 'events', 'games', 'wellness', 'volunteering'].includes(form.category)) throw new Error('Choose a valid category.')
  if (!['low', 'medium', 'high'].includes(form.energyLevel)) throw new Error('Choose a valid energy level.')
  if (!(lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.1)) throw new Error('Directions must point to a location in Singapore.')
  return { title, description, category: form.category, energyLevel: form.energyLevel, groupFriendly: !!form.groupFriendly, area: (form.area ?? '').trim() || 'Singapore', lat, lng }
}

export async function saveNparksPresentation(id, form) {
  await setDoc(doc(db, externalListings, id), {
    ...nparksPresentation(form), source: 'externalListings', provider: NPARKS_PROVIDER, contentType: NPARKS_CONTENT_TYPE,
  }, { merge: true })
}
