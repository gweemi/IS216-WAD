import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import {
  switchUser, applyRemote, markRemoteLoaded, snapshotOf, hasData, userStoreNames, currentUid, setRemoteWriter,
} from '@/stores/userData'
import '@/stores/wellbeing'
import '@/stores/reflections'
import '@/stores/gamification(badges).js'

const SAVE_DELAY_MS = 400
let unsubs = []
const timers = {}

const refFor = (uid, name) => doc(db, 'users', uid, 'private', name)

function save(uid, name) {
  const data = snapshotOf(name)
  if (!uid || !data) return Promise.resolve()
  return setDoc(refFor(uid, name), { ...data, updatedAt: serverTimestamp() }).catch((err) => {
    console.warn(`Could not save ${name} to your account:`, err?.code || err)
  })
}

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
  switchUser(uid)
  if (!uid) return

  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const auth = useAuthStore()
        if (snap.metadata.hasPendingWrites || !snap.exists() || auth.user?.uid !== uid) return
        auth.setProfile(snap.data())
      },
      (err) => console.warn('Could not keep your profile up to date:', err?.code || err),
    ),
  )

  for (const name of userStoreNames()) {
    unsubs.push(
      onSnapshot(
        refFor(uid, name),
        (snap) => {
          if (snap.metadata.hasPendingWrites || timers[name]) return
          if (snap.exists()) {
            const { updatedAt: _updatedAt, ...data } = snap.data()
            applyRemote(name, data, uid)
          } else {
            markRemoteLoaded(name, uid)
            if (hasData(name)) save(uid, name)
          }
        },
        (err) => console.warn(`Could not load ${name} from your account:`, err?.code || err),
      ),
    )
  }
}
