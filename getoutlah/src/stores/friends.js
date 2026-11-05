// =============================================================
// GetOutLah! — Friends & notifications state
//   import { friendsState, friendList, unreadCount } from '@/stores/friends'
// The live data is filled in by src/services/friends.js (Firestore listeners).
// This file has no Firebase imports, so components like the nav bar can use it in tests.
// =============================================================
import { reactive, computed } from 'vue'
import { otherMember, toMillis } from '@/utils/friends'
import { privacyOf, visibleProfile } from '@/config/privacy'

function emptyState() {
  return {
    uid: null,
    friendships: [], // docs from friendships/ that include me
    profiles: {}, // uid → users/{uid} data for my friends and people who sent me requests
    notifications: [], // docs from notifications/ sent to me, newest first
    ready: false,
    error: '',
  }
}

export const friendsState = reactive(emptyState())

export function resetFriendsState() {
  Object.assign(friendsState, emptyState())
}

function withProfile(f) {
  const uid = otherMember(f, friendsState.uid)
  const raw = friendsState.profiles[uid] || {}
  const p = visibleProfile(raw) // hides what they switched off in Profile → Privacy
  return {
    id: f.id,
    uid,
    name: p.displayName || f.names?.[uid] || 'Someone',
    photoURL: privacyOf(raw).showPhoto ? p.photoURL || f.photos?.[uid] || null : null,
    universityName: p.universityName || null,
    checkedIn: p.checkedInActivityIds || [],
    since: toMillis(f.acceptedAt || f.createdAt),
  }
}

/** Accepted friends, A–Z. */
export const friendList = computed(() =>
  friendsState.friendships
    .filter((f) => f.status === 'accepted')
    .map(withProfile)
    .sort((a, b) => a.name.localeCompare(b.name)),
)

/** Requests other people sent me that I haven't answered. */
export const incomingRequests = computed(() =>
  friendsState.friendships
    .filter((f) => f.status === 'pending' && f.requestedBy !== friendsState.uid)
    .map(withProfile),
)

/** Requests I sent that are still waiting. */
export const outgoingRequests = computed(() =>
  friendsState.friendships
    .filter((f) => f.status === 'pending' && f.requestedBy === friendsState.uid)
    .map(withProfile),
)

export const unreadCount = computed(() => friendsState.notifications.filter((n) => !n.read).length)

/** What's my relationship with this person? 'friends' | 'sent' | 'received' | 'none' */
export function relationshipWith(uid) {
  const f = friendsState.friendships.find((x) => x.members.includes(uid))
  if (!f) return 'none'
  if (f.status === 'accepted') return 'friends'
  return f.requestedBy === friendsState.uid ? 'sent' : 'received'
}
