// Safe, operator-run migration from activities/{id} to source-owned collections.
// Nothing runs unless one explicit mode is supplied. This script is intended for
// a maintenance window; it never deletes legacy documents in --apply mode.
//
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 GCLOUD_PROJECT=getoutlah-migration-emulator node scripts/migrate-activities-collections.mjs --preflight
// FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --preflight
// FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --backup /secure/activities-backup.json
// FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --validate
// FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --apply --confirm-apply --manifest /secure/activities-manifest.json
// FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --verify
//
// `--restore` and `--reconcile-to-legacy` are recovery commands. Read
// MIGRATION_RUNBOOK.md before using either against any shared Firestore project.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore'
import { ACTIVITY_COLLECTIONS, ACTIVITY_SOURCES } from '../src/utils/activitySource.js'
import { classifyLegacyActivity, destinationPathForActivity } from '../src/utils/activityMigration.js'

const args = process.argv.slice(2)
const PRODUCTION_PROJECT = 'getoutlah-4d959'
const PRODUCTION_DATABASE = '(default)'
const mode = ['--preflight', '--backup', '--validate', '--apply', '--verify', '--restore', '--reconcile-to-legacy']
  .find((flag) => args.includes(flag))
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index < 0 ? null : args[index + 1] ?? null
}

if (!mode) throw new Error(`Choose one mode: ${mode.join(', ')}`)

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
const isEmulator = Boolean(emulatorHost)
const isProduction = args.includes('--production')
let firebaseApp
if (isEmulator && isProduction) throw new Error('Use either FIRESTORE_EMULATOR_HOST or --production, never both.')
if (!isEmulator && !isProduction) throw new Error('Refusing to select a Firestore target. Set FIRESTORE_EMULATOR_HOST for local rehearsal or pass --production with credentials.')

if (isEmulator) {
  if (!/^[a-zA-Z0-9.-]+:\d+$/.test(emulatorHost)) throw new Error('FIRESTORE_EMULATOR_HOST must be host:port without a protocol.')
  const projectId = process.env.GCLOUD_PROJECT
  if (!projectId) throw new Error('GCLOUD_PROJECT is required in emulator mode.')
  // This connection probe prevents a missing emulator from ever falling back
  // to a real Firestore project. Any HTTP response means the local endpoint is
  // reachable; connection errors fail before a database read or write.
  try {
    await fetch(`http://${emulatorHost}/`)
  } catch (error) {
    throw new Error(`Firestore Emulator at ${emulatorHost} is unavailable: ${error.message}`)
  }
  firebaseApp = initializeApp({ projectId })
} else {
  const requestedProject = valueAfter('--project')
  const requestedDatabase = valueAfter('--database')
  if (requestedProject !== PRODUCTION_PROJECT) {
    throw new Error(`Production migration requires --project ${PRODUCTION_PROJECT}; received ${requestedProject ?? '(missing)'}.`)
  }
  if (requestedDatabase !== PRODUCTION_DATABASE) {
    throw new Error(`Production migration requires --database '${PRODUCTION_DATABASE}'; received ${requestedDatabase ?? '(missing)'}.`)
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required with --production.')
  let serviceAccount
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.')
  }
  if (serviceAccount.project_id !== requestedProject) {
    throw new Error(`Service-account project_id ${serviceAccount.project_id ?? '(missing)'} does not match requested project ${requestedProject}.`)
  }
  firebaseApp = initializeApp({ projectId: requestedProject, credential: cert(serviceAccount) })
  if (firebaseApp.options.projectId !== requestedProject) {
    throw new Error('Firebase Admin SDK project does not match the requested production project.')
  }
}
if (!isEmulator && mode === '--apply' && !args.includes('--confirm-apply')) {
  throw new Error('Production copy requires --confirm-apply after backup and validation review.')
}
if (!isEmulator && mode === '--restore' && !args.includes('--confirm-restore')) {
  throw new Error('Production restore requires --confirm-restore.')
}
if (!isEmulator && mode === '--reconcile-to-legacy' && !args.includes('--confirm-reconcile')) {
  throw new Error('Production reconciliation requires --confirm-reconcile.')
}
const db = isEmulator ? getFirestore(firebaseApp) : getFirestore(firebaseApp, PRODUCTION_DATABASE)
const LEGACY_COLLECTION = 'activities'

// JSON alone does not preserve Firestore types. The backup encoder is explicit
// so snapshots can be restored by this script without changing values.
function encode(value) {
  if (value instanceof Timestamp) return { __firestoreType: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds }
  if (value instanceof GeoPoint) return { __firestoreType: 'geopoint', latitude: value.latitude, longitude: value.longitude }
  if (value instanceof DocumentReference) return { __firestoreType: 'reference', path: value.path }
  if (Buffer.isBuffer(value)) return { __firestoreType: 'bytes', base64: value.toString('base64') }
  if (Array.isArray(value)) return value.map(encode)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]))
  return value
}

function decode(value) {
  if (Array.isArray(value)) return value.map(decode)
  if (!value || typeof value !== 'object') return value
  if (value.__firestoreType === 'timestamp') return new Timestamp(value.seconds, value.nanoseconds)
  if (value.__firestoreType === 'geopoint') return new GeoPoint(value.latitude, value.longitude)
  if (value.__firestoreType === 'reference') return db.doc(value.path)
  if (value.__firestoreType === 'bytes') return Buffer.from(value.base64, 'base64')
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]))
}

const stable = (value) => JSON.stringify(encode(value))
const checksum = (value) => createHash('sha256').update(stable(value)).digest('hex')
const same = (left, right) => stable(left) === stable(right)

async function collectTree(snapshot, path = snapshot.ref.path) {
  const docs = [{ path, data: snapshot.data() }]
  const subcollections = await snapshot.ref.listCollections()
  for (const childCollection of subcollections) {
    const childSnapshots = await childCollection.get()
    for (const child of childSnapshots.docs) docs.push(...await collectTree(child, child.ref.path))
  }
  return docs
}

async function legacyTrees() {
  const roots = await db.collection(LEGACY_COLLECTION).get()
  const trees = []
  for (const root of roots.docs) {
    const target = classifyLegacyActivity(root.data(), root.id)
    trees.push({ id: root.id, ...target, docs: await collectTree(root) })
  }
  return trees
}

function destinationDocs(tree) {
  return tree.docs.map((item, index) => ({
    path: destinationPathForActivity(tree, item.path),
    data: index === 0 ? tree.data : item.data,
  }))
}

async function checkDestinations(trees) {
  const conflicts = []
  let existing = 0
  for (const tree of trees) {
    for (const item of destinationDocs(tree)) {
      const snapshot = await db.doc(item.path).get()
      if (!snapshot.exists) continue
      existing++
      if (!same(snapshot.data(), item.data)) conflicts.push(item.path)
    }
  }
  return { existing, conflicts }
}

function report(trees) {
  const byCollection = Object.fromEntries(Object.values(ACTIVITY_COLLECTIONS).map((collection) => [collection, 0]))
  let nestedDocuments = 0
  for (const tree of trees) {
    byCollection[tree.collection]++
    nestedDocuments += tree.docs.length - 1
  }
  return { roots: trees.length, nestedDocuments, byCollection }
}

async function writeTypedFile(path, payload, { exclusive = false } = {}) {
  const body = { ...payload, checksum: checksum(payload) }
  await writeFile(path, `${JSON.stringify(body, null, 2)}\n`, { mode: 0o600, flag: exclusive ? 'wx' : 'w' })
  console.log(`Wrote ${path} (${body.checksum})`)
  return body
}

async function readTypedFile(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  const { checksum: expected, ...payload } = parsed
  if (!expected || checksum(payload) !== expected) throw new Error(`Checksum mismatch in ${path}`)
  return parsed
}

async function commitSets(items) {
  for (let start = 0; start < items.length; start += 500) {
    const batch = db.batch()
    items.slice(start, start + 500).forEach((item) => batch.set(db.doc(item.path), item.data))
    await batch.commit()
  }
}

async function verify(trees) {
  const missing = [], different = []
  for (const tree of trees) {
    for (const item of destinationDocs(tree)) {
      const snapshot = await db.doc(item.path).get()
      if (!snapshot.exists) missing.push(item.path)
      else if (!same(snapshot.data(), item.data)) different.push(item.path)
    }
  }
  return { missing, different }
}

async function backup(trees, path) {
  if (!path) throw new Error('--backup requires an output path.')
  const docs = trees.flatMap((tree) => tree.docs.map((item) => ({
    path: item.path,
    // Backups preserve the exact legacy document. Canonicalisation is only
    // applied to the destination copy, never to the recovery snapshot.
    data: encode(item.data),
  })))
  return writeTypedFile(path, {
    version: 1,
    createdAt: new Date().toISOString(),
    rootCollection: LEGACY_COLLECTION,
    report: report(trees),
    documents: docs,
  }, { exclusive: true })
}

async function restore(path) {
  if (!path) throw new Error('--restore requires a verified backup path.')
  const backupFile = await readTypedFile(path)
  if (backupFile.rootCollection !== LEGACY_COLLECTION) throw new Error('Backup is not for the legacy activities collection.')
  await commitSets(backupFile.documents.map((item) => ({ path: item.path, data: decode(item.data) })))
  console.log(`Restored ${backupFile.documents.length} documents. This does not delete documents absent from the backup.`)
}

// Reconciliation is only for rollback after writes have resumed. It mirrors
// current new-collection state into legacy and deletes only baseline legacy
// paths that are now absent from the corresponding new collection.
async function reconcile(path) {
  if (!path) throw new Error('--reconcile-to-legacy requires the pre-cutover backup path.')
  const backupFile = await readTypedFile(path)
  const baseline = new Map(backupFile.documents.map((item) => [item.path, decode(item.data)]))
  const current = []
  for (const source of [ACTIVITY_SOURCES.PICKS, ACTIVITY_SOURCES.EXTERNAL]) {
    const collectionName = ACTIVITY_COLLECTIONS[source]
    const roots = await db.collection(collectionName).get()
    for (const root of roots.docs) {
      if (root.data().source !== source) throw new Error(`${root.ref.path} has inconsistent source.`)
      const tree = { id: root.id, collection: collectionName, data: root.data(), docs: await collectTree(root) }
      current.push(...tree.docs.map((item) => ({ path: `${LEGACY_COLLECTION}/${root.id}${item.path.slice(`${collectionName}/${root.id}`.length)}`, data: item.data })))
    }
  }
  const currentPaths = new Set(current.map((item) => item.path))
  const writes = current.map((item) => ({ type: 'set', ...item }))
  const deletes = [...baseline.keys()].filter((path) => !currentPaths.has(path)).sort((a, b) => b.split('/').length - a.split('/').length)
  const operations = writes.concat(deletes.map((path) => ({ type: 'delete', path })))
  for (let start = 0; start < operations.length; start += 500) {
    const batch = db.batch()
    operations.slice(start, start + 500).forEach((item) => {
      if (item.type === 'delete') batch.delete(db.doc(item.path))
      else batch.set(db.doc(item.path), item.data)
    })
    await batch.commit()
  }
  console.log(`Reconciled ${writes.length} current documents and removed ${deletes.length} legacy-only documents.`)
}

if (mode === '--restore') {
  await restore(valueAfter('--restore'))
  process.exit(0)
}
if (mode === '--reconcile-to-legacy') {
  await reconcile(valueAfter('--reconcile-to-legacy'))
  process.exit(0)
}

const trees = await legacyTrees()
const summary = report(trees)
console.log(JSON.stringify(summary, null, 2))

if (mode === '--preflight') process.exit(0)
if (mode === '--backup') {
  await backup(trees, valueAfter('--backup'))
  process.exit(0)
}

const destinationCheck = await checkDestinations(trees)
if (destinationCheck.conflicts.length) {
  throw new Error(`Destination conflicts (${destinationCheck.conflicts.length}): ${destinationCheck.conflicts.slice(0, 20).join(', ')}`)
}
console.log(`Destination check passed (${destinationCheck.existing} identical documents already present).`)

if (mode === '--validate') process.exit(0)
if (mode === '--apply') {
  const manifestPath = valueAfter('--manifest')
  if (!manifestPath) throw new Error('--apply requires --manifest <path>. Run --backup first.')
  await commitSets(trees.flatMap(destinationDocs))
  const result = await verify(trees)
  if (result.missing.length || result.different.length) throw new Error(`Verification failed: ${result.missing.length} missing, ${result.different.length} different.`)
  await writeTypedFile(manifestPath, {
    version: 1,
    createdAt: new Date().toISOString(),
    backupOf: LEGACY_COLLECTION,
    report: summary,
    destinations: trees.flatMap(destinationDocs).map((item) => ({ path: item.path, data: encode(item.data) })),
  }, { exclusive: true })
  console.log('Copy and verification succeeded. Legacy activities were not modified.')
  process.exit(0)
}

if (mode === '--verify') {
  const result = await verify(trees)
  if (result.missing.length || result.different.length) throw new Error(`Verification failed: ${result.missing.length} missing, ${result.different.length} different.`)
  console.log('Verification passed.')
}
