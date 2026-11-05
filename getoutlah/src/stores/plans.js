import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

export const planIds = () => useAuthStore().profile?.plans ?? []
export const isPlanned = (id) => planIds().includes(id)

export async function togglePlan(id) {
  const auth = useAuthStore()
  const plans = planIds()
  const has = plans.includes(id)
  await updateDoc(doc(db, 'users', auth.user.uid), { plans: has ? arrayRemove(id) : arrayUnion(id) })
  auth.setProfile({ ...auth.profile, plans: has ? plans.filter((x) => x !== id) : [...plans, id] })
}

export async function removePlan(id) {
  if (isPlanned(id)) await togglePlan(id)
}
