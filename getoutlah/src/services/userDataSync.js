// =============================================================
// Keeps private per-account data in Firestore so it follows the user across devices:
//   users/{uid}/private/wellbeing    { history: [{ date, score }], updatedAt }
//   users/{uid}/private/reflections  { pending, entries, promptsOn, dismissed, updatedAt }
//   users/{uid}/private/gamification { completed, ledger, earnedBadges, studyBreak, pausedWeeks, redemptions, updatedAt }
// firestore.rules: only the owner can read or write these. (See src/stores/userData.js.)
//
// startUserDataSync(uid) is called from main.js whenever the logged-in user changes.
// =============================================================
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import {
  switchUser, applyRemote, snapshotOf, hasData, userStoreNames, currentUid, setRemoteWriter,
} from '@/stores/userData'
// Make sure the stores have registered before we sync them
import '@/stores/wellbeing'
import '@/stores/reflections'
import '@/stores/gamification(badges).js'

const SAVE_DELAY_MS = 400
let unsubs = []
const timers = {} // name → pending save

const refFor = (uid, name) => doc(db, 'users', uid, 'private', name)

function save(uid, name) {
  const data = snapshotOf(name)
  if (!uid || !data) return Promise.resolve()
  return setDoc(refFor(uid, name), { ...data, updatedAt: serverTimestamp() }).catch((err) => {
    console.warn(`Could not save ${name} to your account:`, err?.code || err)
  })
}

// Wait a moment so several quick changes are saved together
setRemoteWriter((name) => {
  const uid = currentUid()
  clearTimeout(timers[name])
  timers[name] = setTimeout(() => {
    delete timers[name]
    save(uid, name)
  }, SAVE_DELAY_MS)
})

function stop() {
  unsubs.forEach((u) => u())
  unsubs = []
  for (const name of Object.keys(timers)) {
    clearTimeout(timers[name])
    delete timers[name]
  }
}

export function startUserDataSync(uid) {
  if ((uid ?? null) === currentUid() && (unsubs.length || !uid)) return
  stop()
  switchUser(uid) // show this account's own copy straight away (or empty when logged out)
  if (!uid) return

  for (const name of userStoreNames()) {
    unsubs.push(
      onSnapshot(
        refFor(uid, name),
        (snap) => {
          if (snap.metadata.hasPendingWrites || timers[name]) return // our own change is on its way
          if (snap.exists()) {
            const { updatedAt: _updatedAt, ...data } = snap.data()
            applyRemote(name, data, uid)
          } else if (hasData(name)) {
            save(uid, name) // first time: upload what this browser already had for this account
          }
        },
        (err) => console.warn(`Could not load ${name} from your account:`, err?.code || err),
      ),
    )
  }
}
