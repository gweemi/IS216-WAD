// Admin tool: copy the organisers' live Eventbrite events into the Firestore "activities" collection.
// A GitHub Action (scripts/sync-eventbrite.mjs) does the same every day; this button is for running it by hand.
// It is safe to run again: existing activities only get their Eventbrite-owned fields refreshed
// (title, time, price, place), so manual edits to category, energy level etc. are kept.
// Events that have ended or were taken off Eventbrite are deleted.
import { collection, getDoc, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { fetchEvents, planActivityWrites } from '@/utils/eventbriteMap'
import { getOrganisers } from './organisers'

// When the daily GitHub Action last finished. "Sync now" doesn't change it, so it shows the 6am run is working.
export async function getLastDailySync() {
  const snap = await getDoc(doc(db, 'config', 'eventbriteSync'))
  return snap.data()?.lastDailySyncAt ?? null
}

// The token is typed on the admin page, so it never has to be baked into the website.
export async function syncEventbriteToFirestore({ token } = {}) {
  if (useAuthStore().profile?.role !== 'admin') throw new Error('Admins only')
  if (!token) throw new Error('Enter the Eventbrite token first.')
  const ids = (await getOrganisers()).map((o) => o.id)
  if (!ids.length) throw new Error('Add at least one organiser first.')

  const { events, failures, failedOrganisers } = await fetchEvents(token, ids)
  const existing = new Map((await getDocs(collection(db, 'activities'))).docs.map((d) => [d.id, d.data()]))
  const { writes, deletes, added, updated, skipped, removed } = planActivityWrites(events, existing, Date.now(), failedOrganisers)
  for (let i = 0; i < writes.length; i += 500) {   // a Firestore batch holds up to 500 writes
    const batch = writeBatch(db)
    writes.slice(i, i + 500).forEach((w) => batch.set(doc(db, 'activities', w.id), w.data, { merge: w.merge }))
    await batch.commit()
  }
  for (let i = 0; i < deletes.length; i += 500) {
    const batch = writeBatch(db)
    deletes.slice(i, i + 500).forEach((id) => batch.delete(doc(db, 'activities', id)))
    await batch.commit()
  }
  return { added, updated, skipped, removed, failures }
}
