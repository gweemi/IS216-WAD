// Firestore rules for users/{uid}/private/* (wellbeing + reflections).
// Runs only with the emulator, like firestoreRulesEmulator.spec.js:
//   pnpm exec firebase emulators:exec --only firestore --project demo-getoutlah "pnpm test:unit --run"
import { afterAll, beforeAll, describe, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const host = process.env.FIRESTORE_EMULATOR_HOST
const [rulesHost, rulesPort] = (host ?? '127.0.0.1:0').split(':')
const emulatorDescribe = host ? describe : describe.skip
let testEnv

emulatorDescribe('private wellbeing + reflections rules', () => {
  beforeAll(async () => {
    const rules = await readFile(`${process.cwd()}/firestore.rules`, 'utf8')
    testEnv = await initializeTestEnvironment({
      projectId: 'getoutlah-private-data',
      firestore: { host: rulesHost, port: Number(rulesPort), rules },
    })
  })
  afterAll(async () => { await testEnv?.cleanup() })

  const amy = () => testEnv.authenticatedContext('amy').firestore()
  const ben = () => testEnv.authenticatedContext('ben').firestore()
  const wellbeing = (db, uid = 'amy') => doc(db, 'users', uid, 'private', 'wellbeing')

  it('lets the owner save and read their check-ins', async () => {
    await assertSucceeds(setDoc(wellbeing(amy()), { history: [{ date: '2026-11-05', score: 64 }], updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(wellbeing(amy())))
  })

  it('stops anyone else reading or writing them', async () => {
    await assertFails(getDoc(wellbeing(ben())))
    await assertFails(setDoc(wellbeing(ben()), { history: [], updatedAt: serverTimestamp() }))
  })

  it('rejects unexpected fields and unknown documents', async () => {
    await assertFails(setDoc(wellbeing(amy()), { history: [], secret: 1, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(amy(), 'users', 'amy', 'private', 'other'), { updatedAt: serverTimestamp() }))
  })

  it('accepts reflections in the app’s shape', async () => {
    await assertSucceeds(setDoc(doc(amy(), 'users', 'amy', 'private', 'reflections'), {
      pending: [], entries: [{ id: 'r1', activityId: 'a1', mood: 3, note: '' }], promptsOn: true, dismissed: [],
      updatedAt: serverTimestamp(),
    }))
  })
})
