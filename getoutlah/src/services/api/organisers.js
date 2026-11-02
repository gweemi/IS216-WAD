// The Eventbrite organisers we sync, kept in Firestore config/eventbrite as { organisers: [{ id, name }] }.
// Read by the admin page, eventbriteSync.js and the daily GitHub Action (scripts/sync-eventbrite.mjs).
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { DEFAULT_ORGANISERS } from '@/utils/eventbriteMap'

const configDoc = () => doc(db, 'config', 'eventbrite')

export async function getOrganisers() {
  const snap = await getDoc(configDoc())
  // `organizers` is the old spelling, used before the rename
  return snap.exists() ? (snap.data().organisers ?? snap.data().organizers ?? []) : DEFAULT_ORGANISERS
}

export async function addOrganiser(id, name) {
  id = id.trim(); name = name.trim()
  if (!/^\d+$/.test(id)) throw new Error('The organiser id is the number at the end of their Eventbrite page link.')
  const list = await getOrganisers()
  if (list.some((o) => o.id === id)) throw new Error('That organiser is already on the list.')
  const next = [...list, { id, name: name || `Organiser ${id}` }]
  await setDoc(configDoc(), { organisers: next })
  return next
}

// Takes the organiser off the list and deletes their upcoming events, so they disappear from the app.
export async function removeOrganiser(id) {
  const next = (await getOrganisers()).filter((o) => o.id !== id)
  await setDoc(configDoc(), { organisers: next })
  const events = await getDocs(query(collection(db, 'activities'), where('organiserId', '==', id)))
  for (let i = 0; i < events.docs.length; i += 500) {   // a Firestore batch holds up to 500 writes
    const batch = writeBatch(db)
    events.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  return { organisers: next, deleted: events.size }
}
