import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore, GeoPoint, Timestamp } from 'firebase-admin/firestore'

const host = process.env.FIRESTORE_EMULATOR_HOST
const projectId = process.env.GCLOUD_PROJECT ?? 'getoutlah-migration-emulator'
const emulatorDescribe = host ? describe : describe.skip
const root = process.cwd()
const migrationScript = join(root, 'scripts/migrate-activities-collections.mjs')
let app, db, workdir

const run = (args, overrides = {}) => {
  const env = { ...process.env, FIRESTORE_EMULATOR_HOST: host, GCLOUD_PROJECT: projectId, ...overrides }
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete env[key]
  if (!overrides.FIREBASE_SERVICE_ACCOUNT) delete env.FIREBASE_SERVICE_ACCOUNT
  return spawnSync(process.execPath, [migrationScript, ...args], { env, encoding: 'utf8' })
}

const expectOk = (result) => expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)

async function clear() {
  const response = await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`Could not clear emulator: ${response.status}`)
}

beforeAll(async () => {
  if (!host) return
  expect(host).toMatch(/^[^:]+:\d+$/)
  await clear()
  app = initializeApp({ projectId }, 'migration-emulator-seed')
  db = getFirestore(app)
  workdir = await mkdtemp(join(tmpdir(), 'getoutlah-migration-'))

  const now = Timestamp.fromMillis(1_700_000_000_000)
  await db.doc('activities/pick-legacy').set({
    title: 'Legacy Pick', source: 'curated', description: 'Keep all fields', category: 'outdoors',
    lat: 1.3, lng: 103.8, needsReview: false, when: now, point: new GeoPoint(1.3, 103.8), owner: db.doc('users/admin'), bytes: Buffer.from('pick'),
  })
  await db.doc('activities/pick-legacy/audit/one').set({ note: 'nested parent' })
  await db.doc('activities/pick-legacy/audit/one/deep/two').set({ note: 'nested pick' })
  await db.doc('activities/eb-2001').set({
    title: 'Legacy Eventbrite', source: 'eventbrite', needsReview: true, organiserId: '42', startsAt: 1_700_000_000_000,
  })
  await db.doc('activities/eb-2001/audit/one').set({ note: 'nested external' })
  await db.doc('activities/pick-canonical').set({ title: 'Canonical Pick', source: 'getoutlahPicks', category: 'arts', lat: 1.31, lng: 103.81 })
  await db.doc('activities/eb-2002').set({ title: 'Canonical External', source: 'externalListings', needsReview: true })
})

afterAll(async () => {
  if (!host) return
  await clear()
  if (app) await deleteApp(app)
  if (workdir) await rm(workdir, { recursive: true, force: true })
})

emulatorDescribe('activity collection migration on Firestore Emulator', () => {
  it('refuses an unavailable emulator and unsafe production targets before database access', () => {
    const unavailable = run(['--preflight'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:65530' })
    expect(unavailable.status).not.toBe(0)
    expect(unavailable.stderr).toContain('Firestore Emulator')

    const noTarget = run(['--preflight'], { FIRESTORE_EMULATOR_HOST: undefined, GCLOUD_PROJECT: undefined })
    expect(noTarget.status).not.toBe(0)
    expect(noTarget.stderr).toContain('Refusing to select a Firestore target')

    const noProject = run(['--production', '--database', '(default)', '--preflight'], { FIRESTORE_EMULATOR_HOST: undefined, GCLOUD_PROJECT: undefined })
    expect(noProject.status).not.toBe(0)
    expect(noProject.stderr).toContain('requires --project getoutlah-4d959')

    const wrongProject = run(['--production', '--project', 'another-project', '--database', '(default)', '--preflight'], { FIRESTORE_EMULATOR_HOST: undefined, GCLOUD_PROJECT: undefined })
    expect(wrongProject.status).not.toBe(0)
    expect(wrongProject.stderr).toContain('requires --project getoutlah-4d959')

    const wrongDatabase = run(['--production', '--project', 'getoutlah-4d959', '--database', 'other', '--preflight'], { FIRESTORE_EMULATOR_HOST: undefined, GCLOUD_PROJECT: undefined })
    expect(wrongDatabase.status).not.toBe(0)
    expect(wrongDatabase.stderr).toContain("requires --database '(default)'")

    const noCredential = run(['--production', '--project', 'getoutlah-4d959', '--database', '(default)', '--preflight'], { FIRESTORE_EMULATOR_HOST: undefined, GCLOUD_PROJECT: undefined })
    expect(noCredential.status).not.toBe(0)
    expect(noCredential.stderr).toContain('FIREBASE_SERVICE_ACCOUNT is required')

    const mismatchedCredential = run(['--production', '--project', 'getoutlah-4d959', '--database', '(default)', '--preflight'], {
      FIRESTORE_EMULATOR_HOST: undefined,
      GCLOUD_PROJECT: undefined,
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'another-project' }),
    })
    expect(mismatchedCredential.status).not.toBe(0)
    expect(mismatchedCredential.stderr).toContain('does not match requested project')

    const adcWithServiceAccount = run(['--production', '--adc', '--project', 'getoutlah-4d959', '--database', '(default)', '--preflight'], {
      FIRESTORE_EMULATOR_HOST: undefined,
      GCLOUD_PROJECT: undefined,
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'getoutlah-4d959' }),
    })
    expect(adcWithServiceAccount.status).not.toBe(0)
    expect(adcWithServiceAccount.stderr).toContain('--adc cannot be combined')

    const adcWithoutCredentials = run(['--production', '--adc', '--project', 'getoutlah-4d959', '--database', '(default)', '--preflight'], {
      FIRESTORE_EMULATOR_HOST: undefined,
      GCLOUD_PROJECT: undefined,
      GOOGLE_APPLICATION_CREDENTIALS: '/path/that-does-not-exist.json',
    })
    expect(adcWithoutCredentials.status).not.toBe(0)
    expect(adcWithoutCredentials.stderr).toContain('Application Default Credentials are unavailable')

    const adcWithEmulator = run(['--adc', '--preflight'])
    expect(adcWithEmulator.status).not.toBe(0)
    expect(adcWithEmulator.stderr).toContain('Emulator mode is credential-free')
  })

  it('backs up, validates, copies, verifies, retries, restores, and reconciles safely', async () => {
    const backup = join(workdir, 'activities-before.json')
    const manifest = join(workdir, 'activities-manifest.json')

    expectOk(run(['--preflight']))
    expectOk(run(['--backup', backup]))
    const snapshot = JSON.parse(await readFile(backup, 'utf8'))
    expect(snapshot.documents.find((d) => d.path === 'activities/eb-2001').data.source).toBe('eventbrite')
    expect(snapshot.documents.some((d) => d.path === 'activities/pick-legacy/audit/one/deep/two')).toBe(true)

    await db.doc('externalListings/eb-2001').set({ title: 'conflict', source: 'externalListings' })
    const conflict = run(['--validate'])
    expect(conflict.status).not.toBe(0)
    expect(conflict.stderr).toContain('Destination conflicts')
    await db.doc('externalListings/eb-2001').delete()

    expectOk(run(['--validate']))
    expectOk(run(['--apply', '--manifest', manifest]))
    expectOk(run(['--verify']))
    const overwriteManifest = run(['--apply', '--manifest', manifest])
    expect(overwriteManifest.status).not.toBe(0)
    expect(overwriteManifest.stderr).toContain('EEXIST')
    expectOk(run(['--apply', '--manifest', join(workdir, 'activities-manifest-rerun.json')]))

    expect((await db.doc('getoutlahPicks/pick-legacy').get()).data()).toMatchObject({ source: 'getoutlahPicks', needsReview: false })
    expect((await db.doc('externalListings/eb-2001').get()).data()).toMatchObject({ source: 'externalListings', needsReview: true, organiserId: '42' })
    expect((await db.doc('getoutlahPicks/pick-legacy/audit/one/deep/two').get()).data()).toEqual({ note: 'nested pick' })
    expect((await db.doc('externalListings/eb-2001/audit/one').get()).data()).toEqual({ note: 'nested external' })

    await db.doc('activities/pick-legacy').delete()
    expectOk(run(['--restore', backup]))
    expect((await db.doc('activities/pick-legacy').get()).data()).toMatchObject({ source: 'curated', title: 'Legacy Pick' })

    await db.doc('externalListings/eb-2001').delete()
    await db.doc('getoutlahPicks/created-after-cutover').set({ title: 'New Pick', source: 'getoutlahPicks', category: 'arts', lat: 1.3, lng: 103.8 })
    expectOk(run(['--reconcile-to-legacy', backup]))
    expect((await db.doc('activities/eb-2001').get()).exists).toBe(false)
    expect((await db.doc('activities/eb-2001/audit/one').get()).exists).toBe(false)
    expect((await db.doc('activities/created-after-cutover').get()).data()).toMatchObject({ source: 'getoutlahPicks', title: 'New Pick' })
  }, 30000)
})
