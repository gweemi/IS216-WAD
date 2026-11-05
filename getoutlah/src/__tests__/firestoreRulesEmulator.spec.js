import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'

const host = process.env.FIRESTORE_EMULATOR_HOST
const [rulesHost, rulesPort] = (host ?? '127.0.0.1:0').split(':')
const emulatorDescribe = host ? describe : describe.skip
const finalRules = await readFile(`${process.cwd()}/firestore.rules`, 'utf8')
let testEnv
const pick = { title: 'A Pick', source: 'getoutlahPicks', category: 'arts', lat: 1.3, lng: 103.8 }

async function setup(rules, suffix) {
  testEnv = await initializeTestEnvironment({ projectId: `getoutlah-rules-${suffix}`, firestore: { host: rulesHost, port: Number(rulesPort), rules } })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'admin'), { role: 'admin' })
  })
}

afterEach(async () => { await testEnv?.cleanup() })

emulatorDescribe('final activity collection rules', () => {
  it('allows canonical source writes and separate deletes', async () => {
    await setup(finalRules, 'final')
    const admin = testEnv.authenticatedContext('admin').firestore()
    const member = testEnv.authenticatedContext('member').firestore()
    await assertSucceeds(setDoc(doc(admin, 'getoutlahPicks', 'p1'), pick))
    await assertFails(setDoc(doc(admin, 'getoutlahPicks', 'bad'), { ...pick, source: 'externalListings' }))
    await assertSucceeds(deleteDoc(doc(admin, 'getoutlahPicks', 'p1')))
    await assertSucceeds(getDoc(doc(member, 'externalListings', 'anything')))
  })
})
