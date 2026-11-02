// One-time Firestore source migration. It is dry-run by default:
//
//   FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activity-sources.mjs
//   FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activity-sources.mjs --apply
//
// Deploy firestore.rules before using --apply. The Admin SDK bypasses rules,
// but clients must only encounter the new canonical values afterwards.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { LEGACY_SOURCE_MAP } from '../src/utils/activitySource.js'

const apply = process.argv.includes('--apply')
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set.')

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()
const snapshot = await db.collection('activities').get()
const changes = []
const counts = Object.fromEntries(Object.keys(LEGACY_SOURCE_MAP).map((key) => [key, 0]))

for (const activity of snapshot.docs) {
  const next = LEGACY_SOURCE_MAP[activity.data().source]
  if (!next) continue
  counts[activity.data().source]++
  changes.push({ ref: activity.ref, source: next })
}

console.log(`${apply ? '[apply]' : '[dry run]'} scanned ${snapshot.size} activities; ${changes.length} need migration.`)
for (const [source, count] of Object.entries(counts)) console.log(`  ${source} → ${LEGACY_SOURCE_MAP[source]}: ${count}`)

if (!apply) {
  console.log('No writes made. Re-run with --apply after deploying the matching Firestore rules.')
  process.exit(0)
}

for (let start = 0; start < changes.length; start += 500) {
  const batch = db.batch()
  changes.slice(start, start + 500).forEach(({ ref, source }) => batch.update(ref, { source }))
  await batch.commit()
}
console.log(`Migrated ${changes.length} activities.`)
