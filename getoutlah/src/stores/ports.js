// Hooks other features use to read Friends data.
import { friendList } from './friends'

// Friends who checked in to this activity: [{ uid, name }]
export async function friendsWhoDid(activityId) {
  return friendList.value
    .filter((f) => f.checkedIn.includes(String(activityId)))
    .map((f) => ({ uid: f.uid, name: f.name }))
}
