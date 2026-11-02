// Copies the organisers' live Eventbrite events into Firestore "activities".
// Run by .github/workflows/eventbrite-sync.yml every day; you can also run it on your laptop:
//
//   EVENTBRITE_TOKEN=... FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/sync-eventbrite.mjs
//
// Add --dry-run to see what would change without writing anything.
// Uses the Firebase Admin SDK, which skips the Firestore rules, so it doesn't need an admin user.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fetchEvents, planActivityWrites, DEFAULT_ORGANISERS } from '../src/utils/eventbriteMap.js'

const dryRun = process.argv.includes('--dry-run')
const token = process.env.EVENTBRITE_TOKEN
if (!token) throw new Error('EVENTBRITE_TOKEN is not set.')
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set.')

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()

// Same organiser list the admin page edits (Firestore config/eventbrite).
const config = await db.collection('config').doc('eventbrite').get()
const saved = config.exists ? config.data().organisers ?? config.data().organizers : null   // `organizers` = old spelling
const ids = (saved ?? DEFAULT_ORGANISERS).map((o) => o.id)
if (!ids.length) { console.log('No organisers on the list, nothing to sync.'); process.exit(0) }

const { events, failures, failedOrganisers } = await fetchEvents(token, ids)
const existing = new Map((await db.collection('activities').get()).docs.map((d) => [d.id, d.data()]))
const { writes, deletes, added, updated, skipped, removed } = planActivityWrites(events, existing, Date.now(), failedOrganisers)

if (!dryRun) {
  for (let i = 0; i < writes.length; i += 500) {   // a Firestore batch holds up to 500 writes
    const batch = db.batch()
    writes.slice(i, i + 500).forEach((w) => batch.set(db.collection('activities').doc(w.id), w.data, { merge: w.merge }))
    await batch.commit()
  }
  for (let i = 0; i < deletes.length; i += 500) {   // ended or taken off Eventbrite
    const batch = db.batch()
    deletes.slice(i, i + 500).forEach((id) => batch.delete(db.collection('activities').doc(id)))
    await batch.commit()
  }
  // Shown on the admin page. Its own doc because saving organisers overwrites config/eventbrite.
  await db.collection('config').doc('eventbriteSync').set({ lastDailySyncAt: Date.now() })
}

console.log(`${dryRun ? '[dry run] ' : ''}${events.length} events: ${added} added, ${updated} updated, ${skipped} skipped, ${removed} removed.`)
if (failures.length) console.warn(`Some organisers failed: ${failures.join('; ')}`)
