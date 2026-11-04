import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'

const host = process.env.FIRESTORE_EMULATOR_HOST
const [rulesHost, rulesPort] = (host ?? '127.0.0.1:0').split(':')
const emulatorDescribe = host ? describe : describe.skip
const finalRules = await readFile(`${process.cwd()}/firestore.rules`, 'utf8')
const finalLegacy = `    match /activities/{id} {
      allow read, write: if false;
    }`
const transitionLegacy = `    match /activities/{id} {
      allow read: if signedIn();
      allow write: if false;
    }`
const transitionalRules = finalRules.replace(finalLegacy, transitionLegacy)

let testEnv
const pick = { title: 'A Pick', source: 'getoutlahPicks', category: 'arts', lat: 1.3, lng: 103.8 }

async function setup(rules, suffix) {
  testEnv = await initializeTestEnvironment({ projectId: `getoutlah-rules-${suffix}`, firestore: { host: rulesHost, port: Number(rulesPort), rules } })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'admin'), { role: 'admin' })
    await setDoc(doc(context.firestore(), 'activities', 'legacy'), { title: 'Legacy', source: 'curated' })
  })
}

afterEach(async () => { await testEnv?.cleanup() })

emulatorDescribe('final activity collection rules', () => {
  it('allow canonical source writes, separate deletes, and deny legacy reads', async () => {
    await setup(finalRules, 'final')
    const admin = testEnv.authenticatedContext('admin').firestore()
    const member = testEnv.authenticatedContext('member').firestore()
    await assertSucceeds(setDoc(doc(admin, 'getoutlahPicks', 'p1'), pick))
    await assertFails(setDoc(doc(admin, 'getoutlahPicks', 'bad'), { ...pick, source: 'externalListings' }))
    await assertSucceeds(deleteDoc(doc(admin, 'getoutlahPicks', 'p1')))
    await assertSucceeds(getDoc(doc(member, 'externalListings', 'anything')))
    await assertFails(getDoc(doc(member, 'activities', 'legacy')))
  })
})

emulatorDescribe('transitional activity collection rules', () => {
  it('preserve legacy reads but deny all legacy writes', async () => {
    await setup(transitionalRules, 'transition')
    const admin = testEnv.authenticatedContext('admin').firestore()
    const member = testEnv.authenticatedContext('member').firestore()
    await assertSucceeds(getDoc(doc(member, 'activities', 'legacy')))
    await assertFails(setDoc(doc(admin, 'activities', 'legacy'), { title: 'Stale', source: 'curated' }))
    await assertFails(deleteDoc(doc(admin, 'activities', 'legacy')))
    await assertSucceeds(setDoc(doc(admin, 'externalListings', 'eb-1'), { title: 'Event', source: 'externalListings' }))
  })
})
