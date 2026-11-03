// Saves the Privacy switches on the Profile page (users/{uid}.privacy).
// What they hide is applied by visibleProfile() in src/config/privacy.js.
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { DEFAULT_PRIVACY, privacyOf } from '@/config/privacy'

/** Change one or more privacy switches, e.g. savePrivacy({ showPhoto: false }). */
export async function savePrivacy(changes) {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')
  const privacy = { ...privacyOf(auth.profile), ...changes }
  for (const key of Object.keys(privacy)) {
    if (!(key in DEFAULT_PRIVACY) || typeof privacy[key] !== 'boolean') delete privacy[key]
  }
  await updateDoc(doc(db, 'users', auth.user.uid), { privacy })
  auth.setProfile({ ...auth.profile, privacy })
  return privacy
}
