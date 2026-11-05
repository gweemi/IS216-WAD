import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { friendList } from '@/stores/friends'
import { watchJios, friendlyJioError } from '@/services/openjio'
import { canSee, myRole, isInvited, statusOf } from '@/utils/openjio'

let stopListening = null

const notEnded = (j) => statusOf(j) !== 'ended'
const live = (j) => j.status !== 'cancelled' && notEnded(j)

export const useOpenJioStore = defineStore('openJio', {
  state: () => ({
    all: [],
    loading: false,
    error: '',
  }),

  getters: {
    uid() {
      return useAuthStore().user?.uid ?? null
    },
    friends() {
      return friendList.value
    },
    friendIds() {
      return friendList.value.map((f) => f.uid)
    },
    visible(state) {
      return state.all.filter((j) => canSee(j, this.uid, this.friendIds))
    },
    discoverableUpcoming(state) {
      return state.all.filter((j) => live(j) && canSee(j, this.uid, this.friendIds))
    },
    publicUpcoming(state) {
      return state.all.filter((j) => j.visibility === 'public' && live(j))
    },
    invites(state) {
      return state.all.filter(
        (j) => ['invite_only', 'friends'].includes(j.visibility) && isInvited(j, this.uid) && myRole(j, this.uid) === 'none' && live(j),
      )
    },
    mine(state) {
      return state.all.filter((j) => myRole(j, this.uid) !== 'none' && notEnded(j))
    },
    hosting(state) {
      return state.all.filter((j) => myRole(j, this.uid) === 'host' && notEnded(j))
    },
    going(state) {
      return state.all.filter((j) => ['going', 'queued'].includes(myRole(j, this.uid)) && notEnded(j))
    },
    openToJoin(state) {
      return state.all.filter((j) => ['public', 'friends_only'].includes(j.visibility)
        && myRole(j, this.uid) === 'none'
        && canSee(j, this.uid, this.friendIds)
        && live(j))
    },
  },

  actions: {
    start() {
      if (stopListening) return
      this.loading = true
      this.error = ''
      stopListening = watchJios(
        (jios) => {
          this.all = jios
          this.loading = false
        },
        (err) => {
          stopListening = null
          this.error = friendlyJioError(err)
          this.loading = false
        },
      )
    },

    stop() {
      stopListening?.()
      stopListening = null
    },
  },
})
