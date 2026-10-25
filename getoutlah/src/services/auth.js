// Log-in with Google. Anyone with a Google account can sign up.
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { getUniversity } from '@/config/universities'
import { useAuthStore } from '@/stores/auth'

const provider = new GoogleAuthProvider()
// Always show the account chooser, so people can pick which Google account to use.
provider.setCustomParameters({ prompt: 'select_account' })

/**
 * Opens the Google pop-up. Anyone with a Google account can sign in;
 * the first sign-in creates their profile.
 */
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, provider)
  const profile = await ensureUserProfile(user)
  const store = useAuthStore()
  store.setUser(user)
  store.setProfile(profile)
  return user
}

export async function logOut() {
  await signOut(auth)
  useAuthStore().setUser(null)
}

/**
 * Create users/{uid} the first time someone logs in.
 * If they used a university account (e.g. name@smu.edu.sg), we also note which
 * university, so features like "students from my university only" work.
 */
export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()

  const university = getUniversity(user.email) // null for e.g. @gmail.com

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

/** Errors that just mean "the student closed the pop-up": show nothing. */
export function isCancelled(err) {
  return ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err?.code)
}

/** Turn Firebase error codes into messages a student would understand. */
export function friendlyError(err) {
  const messages = {
    'auth/popup-blocked':
      'Your browser blocked the Google pop-up. Allow pop-ups for this site, then try again.',
    'auth/operation-not-allowed':
      'Google sign-in is not turned on yet (Firebase console → Authentication → Sign-in method).',
    'auth/unauthorized-domain':
      'This website address is not allowed to use Google sign-in yet (Firebase console → Authentication → Settings → Authorized domains).',
    'auth/account-exists-with-different-credential':
      'This email already has an account that uses a password. Delete it in Firebase → Authentication → Users, then try again.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'permission-denied': 'Your account could not be set up. Please try again.',
  }
  return messages[err?.code] ?? 'Something went wrong. Please try again.'
}
