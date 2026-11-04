// Produces temporary Firestore-only deployment inputs for the maintenance window.
// Both generated files belong in an operator-only directory outside the repository.
import { readFile, writeFile, access } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { createHash } from 'node:crypto'

const args = process.argv.slice(2)
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index < 0 ? null : args[index + 1] ?? null
}
const rulesOutput = valueAfter('--rules')
const configOutput = valueAfter('--config')
if (!rulesOutput || !configOutput) {
  throw new Error('Usage: node scripts/prepare-transition-rules.mjs --rules /secure/firestore.rules.transition --config /secure/firebase.transition.json')
}
if (rulesOutput === configOutput) throw new Error('Rules and Firebase config outputs must be different files.')

async function rejectExisting(path) {
  try {
    await access(path)
    throw new Error(`Refusing to overwrite existing generated file: ${path}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

await Promise.all([rejectExisting(rulesOutput), rejectExisting(configOutput)])

const finalRules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
const finalLegacy = `    match /activities/{id} {
      allow read, write: if false;
    }`
const transitionalLegacy = `    match /activities/{id} {
      // Maintenance window: old clients may finish reading, but no stale
      // browser can write legacy activities after the cutover begins.
      allow read: if signedIn();
      allow write: if false;
    }`

if (!finalRules.includes(finalLegacy)) throw new Error('Could not find the expected final legacy activities rule.')
const transitionalRules = finalRules.replace(finalLegacy, transitionalLegacy)
// The config deliberately contains only Firestore rules. Its relative path is
// resolved from the temporary config, so it never needs to reference repo files.
const config = {
  firestore: { rules: relative(dirname(configOutput), rulesOutput) },
}
await writeFile(rulesOutput, transitionalRules, { mode: 0o600, flag: 'wx' })
await writeFile(configOutput, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
const checksum = createHash('sha256').update(transitionalRules).digest('hex')
console.log(`Wrote transitional rules to ${rulesOutput}`)
console.log(`Wrote Firestore-only Firebase config to ${configOutput}`)
console.log(`Review the rules before deployment (SHA-256: ${checksum}).`)
