// Hooks other features use to read Friends data.
import { ref } from 'vue'
import { friendList } from './friends'

// My upcoming free-time windows [{ start, end }] in ms.
// Kept up to date by src/services/friends.js; the Activities free-time filter reads it.
export const freeWindows = ref([])

// Friends who checked in to this activity: [{ uid, name }]
export async function friendsWhoDid(activityId) {
  return friendList.value
    .filter((f) => f.checkedIn.includes(String(activityId)))
    .map((f) => ({ uid: f.uid, name: f.name }))
}
