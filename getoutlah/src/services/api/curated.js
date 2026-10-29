// Save and remove admin-picked ("curated") activities. They live in Firestore "activities" next to the
// Eventbrite ones (source: 'curated'), so the list and map show both together.
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { toCuratedActivity } from '@/utils/curated'

// New activity when id is empty, otherwise replaces that activity.
export async function saveCurated(form, id) {
  const { problems, activity } = toCuratedActivity(form)
  if (problems.length) throw new Error(problems.join(' '))
  const ref = id ? doc(db, 'activities', id) : doc(collection(db, 'activities'))
  await setDoc(ref, activity)
  return ref.id
}

export const removeCurated = (id) => deleteDoc(doc(db, 'activities', id))
