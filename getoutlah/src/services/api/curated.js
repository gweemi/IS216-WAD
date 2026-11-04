// Save and remove admin-picked GetOutLah Picks. They live in their own
// Firestore collection; the activity store combines them with external listings.
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { toCuratedActivity } from '@/utils/curated'
import { ACTIVITY_COLLECTIONS } from '@/utils/activitySource'

const picks = ACTIVITY_COLLECTIONS.getoutlahPicks

// New activity when id is empty, otherwise replaces that activity.
export async function saveCurated(form, id) {
  const { problems, activity } = toCuratedActivity(form)
  if (problems.length) throw new Error(problems.join(' '))
  const ref = id ? doc(db, picks, id) : doc(collection(db, picks))
  await setDoc(ref, activity)
  return ref.id
}

export const removeCurated = (id) => deleteDoc(doc(db, picks, id))
