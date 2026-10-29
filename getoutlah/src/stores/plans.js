// =============================================================
// "My plans": activities the user tapped "Join" on (Activity page).
// Saved in Firestore as users/{uid}.plans = [activityId, ...], the same way
// "Save" works (users/{uid}.saved in stores/activities.js).
// OPENJIOs don't need this: joining a jio already puts the user in its
// participants list, and the Profile page reads that from stores/openjio.js.
// =============================================================
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

/** After checking in, the activity moves from "My plans" to "Completed". */
export async function removePlan(id) {
  if (isPlanned(id)) await togglePlan(id)
}
