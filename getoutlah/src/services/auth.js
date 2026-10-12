// All sign-up / log-in logic lives here, so views stay simple and
// E2E tests can target one place.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { getUniversity, normaliseEmail, ALLOWED_DOMAINS_TEXT } from '@/config/universities'

export const MIN_PASSWORD_LENGTH = 8

class AppError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function requireSchoolEmail(email) {
  const university = getUniversity(email)
  if (!university) {
    throw new AppError(
      'app/not-school-email',
      `Only university emails can join (${ALLOWED_DOMAINS_TEXT}).`,
    )
  }
  return university
}

/** Returns a problem with the password, or '' if it's fine. */
export function passwordProblem(password) {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'Include at least one letter and one number.'
  return ''
}

// Where the "verify your email" link sends people back to.
function verificationSettings() {
  return { url: `${window.location.origin}/verify-email` }
}

/** Create an account with a school email and send the verification email. */
export async function signUp({ name, email, password }) {
  const cleanEmail = normaliseEmail(email)
  requireSchoolEmail(cleanEmail)
  const problem = passwordProblem(password)
  if (problem) throw new AppError('app/weak-password', problem)

  const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password)
  await updateProfile(user, { displayName: name.trim() })
  await sendEmailVerification(user, verificationSettings())
  useAuthStore().refresh()
  return user
}

/**
 * Log in. Returns { needsVerification: true } if the email isn't verified yet,
 * so the view can send the user to the "check your inbox" page.
 */
export async function logIn({ email, password }) {
  const cleanEmail = normaliseEmail(email)
  requireSchoolEmail(cleanEmail)
  const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password)
  if (!user.emailVerified) return { needsVerification: true }
  await ensureUserProfile(user)
  return { needsVerification: false }
}

export async function resendVerification() {
  if (!auth.currentUser) throw new AppError('app/not-logged-in', 'Please log in again.')
  await sendEmailVerification(auth.currentUser, verificationSettings())
}

/**
 * Check whether the user has clicked the verification link.
 * Returns true once verified (and creates their profile).
 */
export async function checkVerified() {
  const user = auth.currentUser
  if (!user) return false
  await user.reload()
  useAuthStore().refresh()
  if (!user.emailVerified) return false
  await ensureUserProfile(user)
  return true
}

export async function resetPassword(email) {
  const cleanEmail = normaliseEmail(email)
  requireSchoolEmail(cleanEmail)
  await sendPasswordResetEmail(auth, cleanEmail)
}

export async function logOut() {
  await signOut(auth)
}

/**
 * Create users/{uid} the first time a verified student logs in.
 * The fresh ID token matters: Firestore rules read email_verified from it.
 */
export async function ensureUserProfile(user) {
  await user.getIdToken(true)
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()

  const university = requireSchoolEmail(user.email)
  const profile = {
    displayName: user.displayName || user.email.split('@')[0],
    email: user.email,
    universityId: university.id,
    universityName: university.name,
    points: 0,
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, profile)
  return profile
}

/** Turn Firebase error codes into messages a student would understand. */
export function friendlyError(err) {
  const messages = {
    'app/not-school-email': err.message,
    'app/weak-password': err.message,
    'app/not-logged-in': err.message,
    'auth/email-already-in-use':
      'An account with this email already exists. Try logging in instead.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/invalid-email': "That email address doesn't look right.",
    'auth/weak-password': `Use at least ${MIN_PASSWORD_LENGTH} characters with a letter and a number.`,
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'permission-denied':
      'Your account could not be set up. Make sure you are using a verified school email.',
  }
  return messages[err?.code] ?? 'Something went wrong. Please try again.'
}
