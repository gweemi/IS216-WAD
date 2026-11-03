import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

export async function completeMapOnboarding() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')

  await updateDoc(doc(db, 'users', auth.user.uid), { mapOnboardingCompleted: true })
  auth.setProfile({ ...auth.profile, mapOnboardingCompleted: true })
}
