import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { DEFAULT_ORGANISERS, isEventbriteListing } from '@/utils/eventbriteMap'
import { ACTIVITY_COLLECTIONS } from '@/utils/activitySource'

const externalListings = ACTIVITY_COLLECTIONS.externalListings

const configDoc = () => doc(db, 'config', 'eventbrite')

export async function getOrganisers() {
  const snap = await getDoc(configDoc())
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

export async function removeOrganiser(id) {
  const next = (await getOrganisers()).filter((o) => o.id !== id)
  await setDoc(configDoc(), { organisers: next })
  const result = await getDocs(query(collection(db, externalListings), where('organiserId', '==', id)))
  const events = result.docs.filter((item) => isEventbriteListing(item.data(), item.id))
  for (let i = 0; i < events.length; i += 500) {
    const batch = writeBatch(db)
    events.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  return { organisers: next, deleted: events.length }
}
