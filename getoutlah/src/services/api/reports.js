import {
  collection, deleteField, doc, getDoc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { reportId, suspensionEnd, validateReport } from '@/utils/reports'

function currentUser() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')
  return auth
}


export async function reportJio(jio, form) {
  const problem = validateReport(form)[0]
  if (problem) throw new Error(problem)

  const auth = currentUser()
  const uid = auth.user.uid
  if (jio.hostId === uid) throw new Error("You can't report your own OPENJIO.")

  let reporterName = auth.user.displayName || 'A GetOutLah! user'
  if (auth.profile && auth.profile.displayName) {
    reporterName = auth.profile.displayName
  }

  const reportRef = doc(db, 'reports', reportId(jio.id, uid))
  if ((await getDoc(reportRef)).exists()) throw new Error("You've already reported this OPENJIO.")

  const batch = writeBatch(db)
  batch.set(reportRef, {
    jioId: jio.id,
    jioTitle: jio.title,
    hostId: jio.hostId,
    hostName: jio.hostName,
    reporterId: uid,
    reporterName,
    reason: form.reason,
    details: (form.details ?? '').trim(),
    status: 'open',
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'openjios', jio.id), { status: 'suspended' })
  await batch.commit()
}


export async function getOpenReports() {
  const snap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'open')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getRestrictedUsers() {
  const [banned, suspended] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('banned', '==', true))),
    getDocs(query(collection(db, 'users'), where('suspendedUntil', '>', Timestamp.now()))),
  ])
  const byUid = new Map()
  for (const d of [...banned.docs, ...suspended.docs]) byUid.set(d.id, { uid: d.id, ...d.data() })
  return [...byUid.values()]
}

export async function resolveReportedJio(group, outcome) {
  const auth = currentUser()
  if (['suspendHost', 'banHost'].includes(outcome) && group.hostId === auth.user.uid) {
    throw new Error("You can't suspend or ban yourself.")
  }

  const batch = writeBatch(db)
  const jioRef = doc(db, 'openjios', group.jioId)

  if (outcome === 'restore') {
    if ((await getDoc(jioRef)).exists()) batch.update(jioRef, { status: 'open' })
  } else {
    batch.delete(jioRef)
  }

  if (outcome === 'suspendHost') {
    batch.update(doc(db, 'users', group.hostId), { suspendedUntil: Timestamp.fromDate(suspensionEnd()) })
  }
  if (outcome === 'banHost') {
    batch.update(doc(db, 'users', group.hostId), { banned: true })
  }

  for (const r of group.reports) {
    batch.update(doc(db, 'reports', r.id), {
      status: 'resolved',
      outcome,
      resolvedBy: auth.user.uid,
      resolvedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export function liftRestriction(uid) {
  return updateDoc(doc(db, 'users', uid), { banned: deleteField(), suspendedUntil: deleteField() })
}
