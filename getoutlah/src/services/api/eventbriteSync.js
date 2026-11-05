import { collection, getDoc, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { fetchEvents, planActivityWrites } from '@/utils/eventbriteMap'
import { getOrganisers } from './organisers'
import { ACTIVITY_COLLECTIONS } from '@/utils/activitySource'

const externalListings = ACTIVITY_COLLECTIONS.externalListings

export async function getLastDailySync() {
  const snap = await getDoc(doc(db, 'config', 'eventbriteSync'))
  if (!snap.exists()) {
    return null
  }
  return snap.data().lastDailySyncAt ?? null
}

export async function syncEventbriteToFirestore({ token } = {}) {
  const profile = useAuthStore().profile
  if (!profile || profile.role !== 'admin') throw new Error('Admins only')
  if (!token) throw new Error('Enter the Eventbrite token first.')
  const ids = (await getOrganisers()).map((o) => o.id)
  if (!ids.length) throw new Error('Add at least one organiser first.')

  const { events, failures, failedOrganisers } = await fetchEvents(token, ids)
  const existingDocs = await getDocs(collection(db, externalListings))
  const existing = new Map(existingDocs.docs.map((d) => [d.id, d.data()]))
  const { writes, deletes, added, updated, skipped, removed } = planActivityWrites(events, existing, Date.now(), failedOrganisers)
  for (let i = 0; i < writes.length; i += 500) {
    const batch = writeBatch(db)
    writes.slice(i, i + 500).forEach((w) => batch.set(doc(db, externalListings, w.id), w.data, { merge: w.merge }))
    await batch.commit()
  }
  for (let i = 0; i < deletes.length; i += 500) {
    const batch = writeBatch(db)
    deletes.slice(i, i + 500).forEach((id) => batch.delete(doc(db, externalListings, id)))
    await batch.commit()
  }
  return { added, updated, skipped, removed, failures }
}
