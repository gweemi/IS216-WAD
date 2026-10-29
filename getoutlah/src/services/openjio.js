// =============================================================
// OPENJIO! Firestore calls: create, live list, join, chope, leave, cancel.
// Data lives in the `openjios` collection. See OPENJIO.md.
// The rules for each action are in src/utils/openjio.js.
// =============================================================
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import {
  validateJio,
  applyJoin,
  applyChope,
  applyLeave,
  applyLeaveQueue,
} from '@/utils/openjio'

const jiosRef = collection(db, 'openjios')

function currentUser() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')
  return auth
}

/** Firestore document → plain jio object (dates as JS Dates). */
export function fromDoc(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    ...d,
    startAt: d.startAt?.toDate?.() ?? new Date(d.startAt),
    participants: d.participants ?? [],
    waitlist: d.waitlist ?? [],
    invited: d.invited ?? [],
  }
}

/**
 * Create a new jio. The host is automatically the first person going.
 * Returns the new jio's id.
 */
export async function createJio(form) {
  const problems = validateJio(form)
  if (problems.length) throw new Error(problems[0])

  const auth = currentUser()
  const uid = auth.user.uid

  const jio = {
    title: form.title.trim(),
    category: form.category,
    description: (form.description ?? '').trim(),
    location: form.location.trim(),
    region: form.region,
    lat: form.lat ?? null, // filled in later by the map feature
    lng: form.lng ?? null,
    startAt: Timestamp.fromDate(form.startAt),
    durationMins: form.durationMins,
    cost: form.cost,
    capacity: form.capacity,
    visibility: form.visibility,
    invited: form.visibility === 'friends' ? [...new Set(form.invited)] : [],
    hostId: uid,
    hostName: auth.profile?.displayName || auth.user.displayName || 'A GetOutLah! user',
    participants: [uid],
    waitlist: [],
    status: 'open',
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(jiosRef, jio)
  return ref.id
}

/**
 * Live list of upcoming jios. `onChange(jios)` runs straight away and again
 * every time anyone creates, joins or leaves a jio (live slot updates).
 * Returns a function that stops listening. Call it when the page closes.
 */
export function watchJios(onChange, onError) {
  // Jios that started up to 12 hours ago may still be running, so keep them.
  const since = Timestamp.fromDate(new Date(Date.now() - 12 * 3600 * 1000))
  const q = query(jiosRef, where('startAt', '>=', since), orderBy('startAt'))
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(fromDoc)),
    (err) => onError?.(err),
  )
}

/**
 * Reads the latest version of a jio, applies one of the rules from
 * utils/openjio.js, and saves the result, all in one transaction.
 * If two people tap Join for the last spot at the same moment, Firestore
 * re-runs the second one with fresh data, so the jio can never be overbooked.
 */
async function changeSpots(jioId, rule) {
  const uid = currentUser().user.uid
  const ref = doc(db, 'openjios', jioId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('This jio no longer exists.')
    const { participants, waitlist } = rule(fromDoc(snap), uid)
    tx.update(ref, { participants, waitlist })
  })
}

export const joinJio = (jioId) => changeSpots(jioId, applyJoin)
export const chopeJio = (jioId) => changeSpots(jioId, applyChope)
export const leaveJio = (jioId) => changeSpots(jioId, applyLeave)
export const leaveQueue = (jioId) => changeSpots(jioId, applyLeaveQueue)

/**
 * Names and photos for a list of user ids, e.g. the user's friends for the
 * invite list. Users we can't find are skipped.
 */
export async function getProfiles(uids) {
  const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'users', uid))))
  return snaps
    .filter((snap) => snap.exists())
    .map((snap) => ({
      uid: snap.id,
      displayName: snap.data().displayName || 'GetOutLah! user',
      photoURL: snap.data().photoURL ?? null,
    }))
}

/** Host only: cancel the jio. Everyone still sees it, marked as cancelled. */
export async function cancelJio(jioId) {
  currentUser()
  await updateDoc(doc(db, 'openjios', jioId), { status: 'cancelled' })
}

// What each JioCard button does, and what we tell the user afterwards
const ACTIONS = {
  join: { run: joinJio, done: "You're in! See you there." },
  chope: { run: chopeJio, done: "Choped! If a spot opens up, it's yours." },
  leave: { run: leaveJio, done: 'You left the jio.', confirm: 'Leave this jio?' },
  leaveQueue: { run: leaveQueue, done: 'You left the queue.' },
  cancel: {
    run: cancelJio,
    done: 'Jio cancelled. Everyone will see it is off.',
    confirm: 'Cancel this jio for everyone?',
  },
}

/**
 * Runs a JioCard button ('join', 'chope', 'leave', 'leaveQueue', 'cancel').
 * Asks first for leave/cancel. Returns the message to show, or null if the
 * user changed their mind. Any page that shows JioCards can use this:
 *   <JioCard ... @action="(a) => runJioAction(a, jio.id)" />
 */
export async function runJioAction(action, jioId) {
  const a = ACTIONS[action]
  if (a.confirm && !window.confirm(a.confirm)) return null
  await a.run(jioId)
  return a.done
}

/** Turn Firebase errors into messages a student would understand. */
export function friendlyJioError(err) {
  if (err?.code === 'permission-denied') {
    return "You're not allowed to do that. Refresh the page and try again."
  }
  if (err?.code === 'unavailable') return 'No internet connection. Check your network and try again.'
  if (err?.code === 'failed-precondition') {
    return 'The database needs an index for this list. Check the browser console for the link to create it.'
  }
  return err?.message || 'Something went wrong. Please try again.'
}
