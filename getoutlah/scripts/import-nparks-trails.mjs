import { access, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ACTIVITY_COLLECTIONS } from '../src/utils/activitySource.js'
import { NPARKS_DATASET_ID, VERIFIED_NPARKS_TRAILS, nparksActivity } from '../src/utils/nparksTrails.js'
import { planNparksImport } from '../src/utils/nparksImport.js'

const args = process.argv.slice(2)
const PRODUCTION_PROJECT = 'getoutlah-4d959'
const PRODUCTION_DATABASE = '(default)'
const mode = ['--preflight', '--apply', '--verify'].find((flag) => args.includes(flag))
const valueAfter = (flag) => { const index = args.indexOf(flag); return index < 0 ? null : args[index + 1] ?? null }
const backupPath = valueAfter('--backup')
const isProduction = args.includes('--production')
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

if (!mode) throw new Error('Choose exactly one mode: --preflight, --apply, or --verify.')
if (isProduction === Boolean(emulatorHost)) throw new Error('Use exactly one target: --production or FIRESTORE_EMULATOR_HOST.')
if (!backupPath) throw new Error('--backup /absolute/path/to/manifest.json is required.')
if (!backupPath.startsWith('/')) throw new Error('--backup must be an absolute local path.')
if (isProduction && !args.includes('--adc')) throw new Error('Production import requires --adc; service-account keys are intentionally unsupported.')
if (isProduction && valueAfter('--project') !== PRODUCTION_PROJECT) throw new Error(`Production import requires --project ${PRODUCTION_PROJECT}.`)
if (isProduction && valueAfter('--database') !== PRODUCTION_DATABASE) throw new Error(`Production import requires --database '${PRODUCTION_DATABASE}'.`)
if (isProduction && mode === '--apply' && !args.includes('--confirm-apply')) throw new Error('Production writes require --confirm-apply after reviewing preflight.')
if (emulatorHost && !/^[a-zA-Z0-9.-]+:\d+$/.test(emulatorHost)) throw new Error('FIRESTORE_EMULATOR_HOST must be host:port without a protocol.')

let app
if (emulatorHost) {
  if (!process.env.GCLOUD_PROJECT) throw new Error('GCLOUD_PROJECT is required in emulator mode.')
  try { await fetch(`http://${emulatorHost}/`) } catch (error) { throw new Error(`Firestore Emulator at ${emulatorHost} is unavailable: ${error.message}`) }
  app = initializeApp({ projectId: process.env.GCLOUD_PROJECT })
} else {
  app = initializeApp({ projectId: PRODUCTION_PROJECT, credential: applicationDefault() })
  try { await app.options.credential.getAccessToken() } catch (error) { throw new Error(`Application Default Credentials are unavailable: ${error.message}`) }
  if (app.options.projectId !== PRODUCTION_PROJECT) throw new Error('Firebase Admin SDK project does not match the requested production project.')
}
const db = emulatorHost ? getFirestore(app) : getFirestore(app, PRODUCTION_DATABASE)

async function downloadGeojson() {
  const response = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${NPARKS_DATASET_ID}/poll-download`)
  if (!response.ok) throw new Error(`NParks dataset unavailable (${response.status})`)
  const url = (await response.json())?.data?.url
  if (!url) throw new Error('NParks download URL missing.')
  const data = await fetch(url)
  if (!data.ok) throw new Error(`NParks GeoJSON download failed (${data.status})`)
  return data.json()
}

const external = db.collection(ACTIVITY_COLLECTIONS.externalListings)
const targetIds = VERIFIED_NPARKS_TRAILS.map((trail) => trail.id)
const targetSnapshots = await Promise.all(targetIds.map((id) => external.doc(id).get()))
const existing = new Map(targetSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, snapshot.data()]))
const expectedWrites = VERIFIED_NPARKS_TRAILS.map((trail) => ({ id: trail.id, merge: false, data: nparksActivity(trail) }))
if (mode !== '--verify') {
  const geojson = await downloadGeojson()
  const checked = planNparksImport(geojson, existing)
  if (createHash('sha256').update(JSON.stringify(checked)).digest('hex') !== createHash('sha256').update(JSON.stringify(expectedWrites)).digest('hex')) {
    throw new Error('Validated NParks import plan differs from the reviewed catalog.')
  }
}
const manifest = {
  version: 1, createdAt: new Date().toISOString(), projectId: emulatorHost ? process.env.GCLOUD_PROJECT : PRODUCTION_PROJECT,
  database: emulatorHost ? '(emulator default)' : PRODUCTION_DATABASE, datasetId: NPARKS_DATASET_ID, targetIds,
  before: targetSnapshots.map((snapshot) => ({ id: snapshot.id, exists: snapshot.exists })),
  planHash: createHash('sha256').update(JSON.stringify(expectedWrites)).digest('hex'),
}

async function fileExists(path) { try { await access(path); return true } catch { return false } }
if (mode === '--preflight') {
  if (await fileExists(backupPath)) throw new Error(`Backup manifest already exists: ${backupPath}`)
  await writeFile(backupPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
  if (existing.size) throw new Error(`Preflight stopped: target documents already exist (${[...existing.keys()].join(', ')}). No writes were made.`)
  console.log(`Preflight passed: ${expectedWrites.length} route records validated. Backup manifest: ${backupPath}`)
  process.exit(0)
}

if (!await fileExists(backupPath)) throw new Error(`Backup manifest is missing: ${backupPath}`)
const backup = JSON.parse(await readFile(backupPath, 'utf8'))
if (backup.projectId !== manifest.projectId || backup.database !== manifest.database || backup.datasetId !== NPARKS_DATASET_ID) throw new Error('Backup manifest target does not match this import.')
if (backup.planHash !== manifest.planHash) throw new Error('The reviewed import plan changed since preflight. Run a new preflight with a new backup path.')

if (mode === '--apply') {
  if (JSON.stringify(backup.before) !== JSON.stringify(manifest.before)) throw new Error('Firestore target state changed since preflight. Run a new preflight with a new backup path.')
  if (existing.size) throw new Error(`Apply stopped: target documents already exist (${[...existing.keys()].join(', ')}). No writes were made.`)
  const batch = db.batch()
  expectedWrites.forEach((write) => batch.set(external.doc(write.id), write.data, { merge: false }))
  await batch.commit()
  console.log(`Imported ${expectedWrites.length} NParks route records.`)
  process.exit(0)
}

const expected = new Map(expectedWrites.map((write) => [write.id, write.data]))
const mismatches = targetSnapshots.flatMap((snapshot) => {
  const actual = snapshot.data() ?? {}
  const wanted = expected.get(snapshot.id) ?? {}
  if (!snapshot.exists) return [`${snapshot.id}: missing`]
  const keys = ['source', 'provider', 'contentType', 'lat', 'lng']
  const bad = keys.filter((key) => actual[key] !== wanted[key])
  if (JSON.stringify(actual.nparks) !== JSON.stringify(wanted.nparks)) bad.push('nparks')
  return bad.length ? [`${snapshot.id}: ${bad.join(', ')} mismatch`] : []
})
if (mismatches.length) throw new Error(`Verification failed:\n${mismatches.join('\n')}`)
console.log(`Verification passed: ${targetIds.length} NParks route records match provider, route references, and directions.`)
