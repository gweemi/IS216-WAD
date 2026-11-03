// Reports: Firestore calls for reporting an OPENJIO and for the admin Reports page.
// The rules for each step are in src/utils/reports.js; the database rules are in
// firestore.rules (the "Reports" section).
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

// ---------- Users ----------

/**
 * Report a jio. Saves the report AND suspends the jio together (one batch),
 * so a jio is never suspended without a report explaining why.
 */
export async function reportJio(jio, form) {
  const problem = validateReport(form)[0]
  if (problem) throw new Error(problem)

  const auth = currentUser()
  const uid = auth.user.uid
  if (jio.hostId === uid) throw new Error("You can't report your own OPENJIO.")

  // The name shown to admins: from their profile, else their Google account
  let reporterName = auth.user.displayName || 'A GetOutLah! user'
  if (auth.profile && auth.profile.displayName) {
    reporterName = auth.profile.displayName
  }

  const reportRef = doc(db, 'reports', reportId(jio.id, uid))
  if ((await getDoc(reportRef)).exists()) throw new Error("You've already reported this OPENJIO.")

  const batch = writeBatch(db)
  batch.set(reportRef, {
    jioId: jio.id,
    jioTitle: jio.title, // copied, so the admin can still see it if the jio is removed
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

// ---------- Admins ----------

/** Every report still waiting for an admin, as plain objects. */
export async function getOpenReports() {
  const snap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'open')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Users who are banned or still suspended, for the admin page. */
export async function getRestrictedUsers() {
  const [banned, suspended] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('banned', '==', true))),
    getDocs(query(collection(db, 'users'), where('suspendedUntil', '>', Timestamp.now()))),
  ])
  const byUid = new Map()
  for (const d of [...banned.docs, ...suspended.docs]) byUid.set(d.id, { uid: d.id, ...d.data() })
  return [...byUid.values()]
}

/**
 * What the admin decided about a reported jio. Each one marks all of that jio's
 * reports as resolved, in the same batch as the change itself.
 *   restore      the reports were wrong: the jio goes back to open
 *   remove       delete the jio
 *   suspendHost  delete the jio and suspend the host for 30 days
 *   banHost      delete the jio and ban the host
 */
export async function resolveReportedJio(group, outcome) {
  const auth = currentUser()
  if (['suspendHost', 'banHost'].includes(outcome) && group.hostId === auth.user.uid) {
    throw new Error("You can't suspend or ban yourself.")
  }

  const batch = writeBatch(db)
  const jioRef = doc(db, 'openjios', group.jioId)

  if (outcome === 'restore') {
    // The jio may already be gone (e.g. it was deleted another way), so check first.
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

/** Lift a ban or suspension early. */
export function liftRestriction(uid) {
  return updateDoc(doc(db, 'users', uid), { banned: deleteField(), suspendedUntil: deleteField() })
}
