import {
  addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, Timestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { friendList } from '@/stores/friends'
import { visibleProfile } from '@/config/privacy'
import { applyChope, applyJoin, applyLeave, applyLeaveQueue, validateJio } from '@/utils/openjio'

const jiosRef = collection(db, 'openjios')

function currentUser() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')
  return auth
}

export function fromDoc(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    startAt: data.startAt?.toDate?.() ?? new Date(data.startAt),
    participants: data.participants ?? [],
    waitlist: data.waitlist ?? [],
    invited: data.invited ?? [],
  }
}

function editableFields(form) {
  const invited = ['invite_only', 'friends'].includes(form.visibility)
    ? [...new Set(form.invited ?? [])]
    : []
  return {
    title: form.title.trim(),
    category: form.category,
    description: (form.description ?? '').trim(),
    location: form.location.trim(),
    region: form.region,
    lat: form.lat ?? null,
    lng: form.lng ?? null,
    startAt: Timestamp.fromDate(form.startAt),
    durationMins: form.durationMins,
    cost: form.cost,
    capacity: form.capacity,
    visibility: form.visibility,
    invited,
  }
}

export async function createJio(form) {
  const problem = validateJio(form)[0]
  if (problem) throw new Error(problem)
  const auth = currentUser()
  const ref = await addDoc(jiosRef, {
    ...editableFields(form),
    hostId: auth.user.uid,
    hostName: auth.profile?.displayName || auth.user.displayName || 'A GetOutLah! user',
    participants: [auth.user.uid],
    waitlist: [],
    status: 'open',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateJio(id, form) {
  const problem = validateJio(form)[0]
  if (problem) throw new Error(problem)
  const ref = doc(db, 'openjios', id)
  const existing = await getDoc(ref)
  if (!existing.exists()) throw new Error('This jio no longer exists.')
  const jio = fromDoc(existing)
  if (jio.hostId !== currentUser().user.uid) throw new Error('Only the host can edit this jio.')
  if (jio.status === 'suspended') throw new Error('This jio is suspended while an admin reviews a report.')
  if (form.capacity < jio.participants.length) {
    throw new Error(`Keep at least ${jio.participants.length} spots for people already going.`)
  }
  await updateDoc(ref, editableFields(form))
  return id
}

export function watchJios(onChange, onError) {
  const since = Timestamp.fromDate(new Date(Date.now() - 12 * 3600 * 1000))
  return onSnapshot(
    query(jiosRef, where('startAt', '>=', since), orderBy('startAt')),
    (snap) => onChange(snap.docs.map(fromDoc)),
    (error) => onError?.(error),
  )
}

async function changeSpots(id, rule) {
  const uid = currentUser().user.uid
  const ref = doc(db, 'openjios', id)
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) throw new Error('This jio no longer exists.')
    const jio = fromDoc(snap)
    jio.viewerFriend = friendList.value.some((friend) => friend.uid === jio.hostId)
    const { participants, waitlist } = rule(jio, uid)
    transaction.update(ref, { participants, waitlist })
  })
}

export const joinJio = (id) => changeSpots(id, applyJoin)
export const chopeJio = (id) => changeSpots(id, applyChope)
export const leaveJio = (id) => changeSpots(id, applyLeave)
export const leaveQueue = (id) => changeSpots(id, applyLeaveQueue)

export async function cancelJio(id) {
  const ref = doc(db, 'openjios', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('This jio no longer exists.')
  if (fromDoc(snap).hostId !== currentUser().user.uid) throw new Error('Only the host can cancel this jio.')
  if (fromDoc(snap).status === 'suspended') throw new Error('This jio is suspended while an admin reviews a report.')
  await updateDoc(ref, { status: 'cancelled' })
}

export async function declineJio(id) {
  const uid = currentUser().user.uid
  const ref = doc(db, 'openjios', id)
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) throw new Error('This jio no longer exists.')
    const jio = fromDoc(snap)
    if (!['invite_only', 'friends'].includes(jio.visibility) || !jio.invited.includes(uid)) {
      throw new Error('You do not have an invitation to decline.')
    }
    if (jio.participants.includes(uid) || jio.waitlist.includes(uid)) throw new Error('Leave the jio instead.')
    transaction.update(ref, { invited: jio.invited.filter((person) => person !== uid) })
  })
}

export async function getProfiles(uids) {
  const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'users', uid))))
  return snaps.filter((snap) => snap.exists()).map((snap) => ({
    uid: snap.id,
    displayName: snap.data().displayName || 'GetOutLah! user',
    photoURL: visibleProfile(snap.data()).photoURL,
  }))
}

export async function getJioAttendees(_id, { legacyParticipants = [], hostId = null } = {}) {
  const uid = currentUser().user.uid
  if (uid !== hostId && !legacyParticipants.includes(uid)) throw new Error("Only people going can see who's going.")
  return getProfiles(legacyParticipants)
}

export async function getJioQueue(_id, { waitlist = [], hostId = null } = {}) {
  if (currentUser().user.uid !== hostId) throw new Error('Only the host can see the queue.')
  const profiles = await getProfiles(waitlist)
  const byUid = new Map(profiles.map((p) => [p.uid, p]))
  return waitlist.filter((uid) => byUid.has(uid)).map((uid, i) => ({ ...byUid.get(uid), position: i + 1 }))
}

const ACTIONS = {
  join: [joinJio, "You're in! See you there."],
  chope: [chopeJio, "Choped! If a spot opens up, it's yours."],
  leave: [leaveJio, 'You left the jio.', 'Leave this jio?'],
  leaveQueue: [leaveQueue, 'You left the queue.'],
  cancel: [cancelJio, 'Jio cancelled.', 'Cancel this jio for everyone?'],
  decline: [declineJio, 'Invitation declined.', 'Decline this invitation?'],
}

export async function runJioAction(action, id) {
  const [run, done, confirmation] = ACTIONS[action]
  if (confirmation && !window.confirm(confirmation)) return null
  await run(id)
  return done
}

export function friendlyJioError(error) {
  if (error?.code === 'permission-denied') return "You're not allowed to do that. Refresh and try again."
  if (error?.code === 'unavailable') return 'No internet connection. Check your network and try again.'
  if (error?.code === 'failed-precondition') return error.message || 'That action is not available now.'
  return error?.message || 'Something went wrong. Please try again.'
}
