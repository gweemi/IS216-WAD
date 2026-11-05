import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { getUniversity } from '@/config/universities'
import { useAuthStore } from '@/stores/auth'
import { useBadgeHunt } from '@/composables/useBadgeHunt'

const provider = new GoogleAuthProvider()
const { clearTrackedBadge } = useBadgeHunt()
provider.setCustomParameters({ prompt: 'select_account' })

export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, provider)
  const profile = await ensureUserProfile(user)
  clearTrackedBadge()
  const store = useAuthStore()
  store.setUser(user)
  store.setProfile(profile)
  store.queueMapIntro()
  store.queueBadgeWelcome()
  return user
}

export async function logOut() {
  try {
    await signOut(auth)
  } finally {
    if (!auth.currentUser) useAuthStore().setUser(null)
  }
}

export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()

  const university = getUniversity(user.email)

  const profile = {
    displayName: user.displayName || user.email.split('@')[0],
    email: user.email,
    photoURL: user.photoURL || null,
    universityId: university?.id ?? null,
    universityName: university?.name ?? null,
    points: 0,
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, profile)
  return profile
}

export function isCancelled(err) {
  return ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err?.code)
}

export function friendlyError(err) {
  const messages = {
    'auth/popup-blocked':
      'Your browser blocked the Google pop-up. Allow pop-ups for this site, then try again.',
    'auth/operation-not-allowed': 'Google sign-in is unavailable right now. Please try again later.',
    'auth/unauthorized-domain': "Google sign-in doesn't work on this website address. Please use the official GETOUTLAH! link.",
    'auth/account-exists-with-different-credential':
      'This email is already linked to another sign-in method. Try signing in a different way.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'permission-denied': 'Your account could not be set up. Please try again.',
  }
  return messages[err?.code] ?? 'Something went wrong. Please try again.'
}
