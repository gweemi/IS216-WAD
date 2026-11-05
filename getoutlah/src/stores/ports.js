import { friendList } from './friends'

export async function friendsWhoDid(activityId) {
  return friendList.value
    .filter((f) => f.checkedIn.includes(String(activityId)))
    .map((f) => ({ uid: f.uid, name: f.name }))
}
