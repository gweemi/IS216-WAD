// =============================================================
// GetOutLah! — Friends & notifications (Firestore)
//
// Collections (rules in firestore.rules):
//   friendships/{uidA_uidB}  { members: [uidA, uidB], requestedBy, status: 'pending' | 'accepted',
//                              names: { uid: name }, photos: { uid: url }, createdAt, acceptedAt }
//   notifications/{id}       { to, from, fromName, fromPhoto, type, activityId?, activityTitle?,
//                              read, createdAt }
//                              type: 'friend_request' | 'friend_accepted' | 'activity_invite'
//   users/{uid}.checkedInActivityIds  [activityId] — powers "Friends who have done this"
//
// startFriends(uid) is called from main.js whenever the logged-in user changes.
// =============================================================
import {
  collection, doc, query, where, limit, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc,
  addDoc, writeBatch, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { friendsState, resetFriendsState, relationshipWith } from '@/stores/friends'
import { pairId, otherMember, toMillis } from '@/utils/friends'
import { privacyOf, visibleProfile } from '@/config/privacy'

let unsubs = [] // my friendships, my notifications
const profileUnsubs = {} // uid → unsubscribe, one per friend / requester

function stopAll() {
  unsubs.forEach((u) => u())
  unsubs = []
  for (const uid of Object.keys(profileUnsubs)) {
    profileUnsubs[uid]()
    delete profileUnsubs[uid]
  }
}

/** Start (or stop, with no uid) the live listeners for the logged-in user. */
export function startFriends(uid) {
  if (uid === friendsState.uid) return
  stopAll()
  resetFriendsState()
  if (!uid) return
  friendsState.uid = uid

  const onError = (err) => {
    friendsState.error =
      err?.code === 'permission-denied'
        ? 'Friends could not load. Publish the latest firestore.rules in the Firebase console.'
        : 'Friends could not load. Check your connection.'
  }

  unsubs.push(
    onSnapshot(
      query(collection(db, 'friendships'), where('members', 'array-contains', uid)),
      (snap) => {
        friendsState.friendships = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        friendsState.ready = true
        syncProfileListeners()
      },
      onError,
    ),
  )

  unsubs.push(
    onSnapshot(
      query(collection(db, 'notifications'), where('to', '==', uid), limit(100)),
      (snap) => {
        friendsState.notifications = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      },
      onError,
    ),
  )
}

// Keep one live listener per person I'm connected to, so their profile stays fresh.
function syncProfileListeners() {
  const wanted = new Set(friendsState.friendships.map((f) => otherMember(f, friendsState.uid)))
  for (const uid of wanted) {
    if (profileUnsubs[uid]) continue
    profileUnsubs[uid] = onSnapshot(doc(db, 'users', uid), (snap) => {
      friendsState.profiles = { ...friendsState.profiles, [uid]: snap.data() ?? {} }
    })
  }
  for (const uid of Object.keys(profileUnsubs)) {
    if (!wanted.has(uid)) {
      profileUnsubs[uid]()
      delete profileUnsubs[uid]
    }
  }
}

// ---------- helpers ----------
function me() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in first.')
  return {
    uid: auth.user.uid,
    name: auth.profile?.displayName || auth.user.displayName || auth.email.split('@')[0],
    // Respect my own Profile → Privacy setting when my photo is copied into requests and notifications
    photo: privacyOf(auth.profile).showPhoto ? auth.profile?.photoURL || auth.user.photoURL || null : null,
  }
}

function notify(to, type, extra = {}) {
  const { uid, name, photo } = me()
  return addDoc(collection(db, 'notifications'), {
    to, from: uid, fromName: name, fromPhoto: photo, type, read: false, createdAt: serverTimestamp(), ...extra,
  })
}

// ---------- finding people ----------
/** Look someone up by their exact login email. Returns { uid, ...profile } or null. */
export async function findUserByEmail(email) {
  const clean = email.trim().toLowerCase()
  if (!clean) return null
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', clean), limit(1)))
  if (snap.empty) return null
  const person = { uid: snap.docs[0].id, ...visibleProfile(snap.docs[0].data()) }
  // "Let people find me" switched off: act as if they aren't on GetOutLah!
  return person.discoverable || relationshipWith(person.uid) !== 'none' ? person : null
}

/** A few students from my university that I'm not connected to yet. */
export async function suggestedPeople(universityId, max = 6) {
  if (!universityId) return []
  const snap = await getDocs(query(collection(db, 'users'), where('universityId', '==', universityId), limit(30)))
  return snap.docs
    .map((d) => ({ uid: d.id, ...visibleProfile(d.data()) }))
    .filter((p) => p.discoverable && p.uid !== friendsState.uid && relationshipWith(p.uid) === 'none')
    .slice(0, max)
}

// ---------- friend requests ----------
export async function sendFriendRequest(person) {
  const mine = me()
  if (person.uid === mine.uid) throw new Error("That's you!")
  const status = relationshipWith(person.uid)
  if (status === 'friends') throw new Error(`You and ${person.displayName} are already friends.`)
  if (status === 'sent') throw new Error('Request already sent.')
  if (status === 'received') return acceptFriendRequest(pairId(mine.uid, person.uid))

  const members = [mine.uid, person.uid].sort()
  await setDoc(doc(db, 'friendships', pairId(mine.uid, person.uid)), {
    members,
    requestedBy: mine.uid,
    status: 'pending',
    names: { [mine.uid]: mine.name, [person.uid]: person.displayName || 'Someone' },
    photos: { [mine.uid]: mine.photo, [person.uid]: person.photoURL || null },
    createdAt: serverTimestamp(),
  })
  await notify(person.uid, 'friend_request')
}

export async function acceptFriendRequest(friendshipId) {
  const f = friendsState.friendships.find((x) => x.id === friendshipId)
  if (!f) throw new Error('This request was cancelled.')
  await updateDoc(doc(db, 'friendships', friendshipId), { status: 'accepted', acceptedAt: serverTimestamp() })
  await notify(f.requestedBy, 'friend_accepted')
  await markRequestNotificationsRead(f.requestedBy)
}

/** Decline a request, cancel one I sent, or unfriend. */
export async function removeFriendship(friendshipId) {
  const f = friendsState.friendships.find((x) => x.id === friendshipId)
  await deleteDoc(doc(db, 'friendships', friendshipId))
  if (f) await markRequestNotificationsRead(otherMember(f, friendsState.uid))
}

function markRequestNotificationsRead(fromUid) {
  const ids = friendsState.notifications
    .filter((n) => n.type === 'friend_request' && n.from === fromUid && !n.read)
    .map((n) => n.id)
  return markRead(ids)
}

// ---------- invites ----------
/** Send an activity invite to each friend uid. */
export async function inviteFriends(activity, friendUids) {
  await Promise.all(
    friendUids.map((uid) => notify(uid, 'activity_invite', { activityId: activity.id, activityTitle: activity.title })),
  )
}

// ---------- notifications ----------
export async function markRead(ids) {
  if (!ids.length) return
  const batch = writeBatch(db)
  ids.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }))
  await batch.commit()
}

export function markAllRead() {
  return markRead(friendsState.notifications.filter((n) => !n.read).map((n) => n.id))
}

export function deleteNotification(id) {
  return deleteDoc(doc(db, 'notifications', id))
}

// ---------- check-ins ----------
/** Remember that I did this activity, so it shows under "Friends who have done this" for my friends. */
export function recordCheckIn(activityId) {
  return updateDoc(doc(db, 'users', me().uid), { checkedInActivityIds: arrayUnion(String(activityId)) })
}
