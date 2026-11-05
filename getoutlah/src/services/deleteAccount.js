// =============================================================
// Delete account (Profile → Delete account). Removes everything linked to the user:
//   - jios they host (deleted) and jios they joined, queued for or were invited to (they leave)
//   - friendships and friend requests, and notifications sent to or by them
//   - points, badges, vouchers, wellbeing and reflections (users/{uid}/private/*)
//   - this browser's saved copies, their profile (users/{uid}) and finally their Google sign-in
// Reports they filed are kept for moderation (nobody can delete reports).
//
// Firebase only deletes a sign-in made in the last few minutes, so the user confirms with Google first.
// =============================================================
import { GoogleAuthProvider, reauthenticateWithPopup, deleteUser } from 'firebase/auth'
import { collection, doc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useOpenJioStore } from '@/stores/openjio'
import { forgetCachedUser } from '@/stores/userData'
import { startUserDataSync } from '@/services/userDataSync'
import { startFriends } from '@/services/friends'
import { leaveJio, leaveQueue, declineJio } from '@/services/openjio'

const PRIVATE_DOCS = ['wellbeing', 'reflections', 'gamification']

const docsWhere = (name, field, op, value) => getDocs(query(collection(db, name), where(field, op, value)))

/**
 * Deletes the logged-in user's account and data.
 * Returns { skipped: [text] } for anything that couldn't be removed (e.g. a suspended jio they host).
 * Throws (with a message to show) if something important fails; nothing after that point is deleted.
 */
export async function deleteMyAccount() {
  const user = auth.currentUser
  if (!user) throw new Error('Please log in again.')
  const uid = user.uid
  const skipped = []

  // 1. Confirm with Google, so deleting the sign-in at the end can't fail halfway through
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ login_hint: user.email ?? '' })
  await reauthenticateWithPopup(user, provider)

  // 2. Stop syncing first: otherwise the app would upload this browser's copy again once it's deleted
  startUserDataSync(null)
  startFriends(null)
  useOpenJioStore().stop()
  forgetCachedUser(uid)

  // 3. OPENJIOs: delete the ones I host, leave the rest
  const hosted = await docsWhere('openjios', 'hostId', '==', uid)
  for (const snap of hosted.docs) {
    if (snap.data().status === 'suspended') {
      skipped.push(`"${snap.data().title}" is suspended while an admin reviews a report, so an admin has to remove it.`)
      continue
    }
    await deleteDoc(snap.ref)
  }
  const hostedIds = new Set(hosted.docs.map((d) => d.id))
  const leaveAll = async (field, leave) => {
    const snaps = await docsWhere('openjios', field, 'array-contains', uid)
    for (const snap of snaps.docs) {
      if (hostedIds.has(snap.id)) continue
      // Cancelled or suspended jios can't be changed, so we may not be able to leave those
      await leave(snap.id).catch(() => skipped.push(`Couldn't remove you from "${snap.data().title}" (it was cancelled or suspended).`))
    }
  }
  await leaveAll('participants', leaveJio)
  await leaveAll('waitlist', leaveQueue)
  await leaveAll('invited', declineJio)

  // 4. Friends and notifications
  const friendships = await docsWhere('friendships', 'members', 'array-contains', uid)
  await Promise.all(friendships.docs.map((d) => deleteDoc(d.ref)))
  const [toMe, fromMe] = await Promise.all([
    docsWhere('notifications', 'to', '==', uid),
    docsWhere('notifications', 'from', '==', uid),
  ])
  await Promise.all([...toMe.docs, ...fromMe.docs].map((d) => deleteDoc(d.ref)))

  // 5. Points, badges, vouchers, wellbeing, reflections, then the profile itself
  await Promise.all(PRIVATE_DOCS.map((name) => deleteDoc(doc(db, 'users', uid, 'private', name))))
  await deleteDoc(doc(db, 'users', uid))

  // 6. The Google sign-in for this app
  await deleteUser(user)
  useAuthStore().setUser(null)
  return { skipped }
}

/** Messages a student would understand. */
export function friendlyDeleteError(err) {
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err?.code)) return ''
  if (err?.code === 'auth/user-mismatch') return 'Pick the same Google account you are logged in with.'
  if (err?.code === 'auth/popup-blocked') return 'Your browser blocked the Google pop-up. Allow pop-ups for this site, then try again.'
  if (err?.code === 'auth/requires-recent-login') return 'Please confirm with Google again, then try again.'
  if (err?.code === 'permission-denied') return 'Something stopped us deleting part of your account. Please try again.'
  if (err?.code === 'unavailable') return 'No internet connection. Check your network and try again.'
  return err?.message || 'Something went wrong. Please try again.'
}
