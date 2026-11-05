import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fetchEvents, planActivityWrites, DEFAULT_ORGANISERS } from '../src/utils/eventbriteMap.js'
import { ACTIVITY_COLLECTIONS } from '../src/utils/activitySource.js'

const externalListings = ACTIVITY_COLLECTIONS.externalListings

const dryRun = process.argv.includes('--dry-run')
const token = process.env.EVENTBRITE_TOKEN
if (!token) throw new Error('EVENTBRITE_TOKEN is not set.')
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set.')

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()

const config = await db.collection('config').doc('eventbrite').get()
const saved = config.exists ? config.data().organisers ?? config.data().organizers : null
const ids = (saved ?? DEFAULT_ORGANISERS).map((o) => o.id)
if (!ids.length) { console.log('No organisers on the list, nothing to sync.'); process.exit(0) }

const { events, failures, failedOrganisers } = await fetchEvents(token, ids)
const existing = new Map((await db.collection(externalListings).get()).docs.map((d) => [d.id, d.data()]))
const { writes, deletes, added, updated, skipped, removed } = planActivityWrites(events, existing, Date.now(), failedOrganisers)

if (!dryRun) {
  for (let i = 0; i < writes.length; i += 500) {
    const batch = db.batch()
    writes.slice(i, i + 500).forEach((w) => batch.set(db.collection(externalListings).doc(w.id), w.data, { merge: w.merge }))
    await batch.commit()
  }
  for (let i = 0; i < deletes.length; i += 500) {
    const batch = db.batch()
    deletes.slice(i, i + 500).forEach((id) => batch.delete(db.collection(externalListings).doc(id)))
    await batch.commit()
  }
  await db.collection('config').doc('eventbriteSync').set({ lastDailySyncAt: Date.now() })
}

console.log(`${dryRun ? '[dry run] ' : ''}${events.length} events: ${added} added, ${updated} updated, ${skipped} skipped, ${removed} removed.`)
if (failures.length) console.warn(`Some organisers failed: ${failures.join('; ')}`)
