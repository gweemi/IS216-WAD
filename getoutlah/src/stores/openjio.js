// The live list of OPENJIOs, shared across the app (Pinia store).
//   const jios = useOpenJioStore(); jios.start()
//   jios.publicUpcoming → public jios for the Activities list and the map
//   jios.invites        → friends-only jios this user was invited to (not joined yet)
//   jios.mine           → jios this user hosts, joined or choped
//   jios.openToJoin     → public jios this user isn't in yet
//   jios.friends        → this user's friends (from the Friends feature), for the invite list
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
    all: [], // every upcoming jio from Firestore, soonest first
    loading: false,
    error: '',
  }),

  getters: {
    uid() {
      return useAuthStore().user?.uid ?? null
    },
    /** Accepted friends from the Friends feature: [{ uid, name, photoURL }]. */
    friends() {
      return friendList.value
    },
    friendIds() {
      return friendList.value.map((f) => f.uid)
    },
    /** Every jio this user is allowed to see. */
    visible(state) {
      return state.all.filter((j) => canSee(j, this.uid, this.friendIds))
    },
    /** Jios the current user may discover in the app. */
    discoverableUpcoming(state) {
      return state.all.filter((j) => live(j) && canSee(j, this.uid, this.friendIds))
    },
    /** Public jios that are still on. */
    publicUpcoming(state) {
      return state.all.filter((j) => j.visibility === 'public' && live(j))
    },
    /** Friends-only jios this user was invited to but hasn't joined yet. */
    invites(state) {
      return state.all.filter(
        (j) => ['invite_only', 'friends'].includes(j.visibility) && isInvited(j, this.uid) && myRole(j, this.uid) === 'none' && live(j),
      )
    },
    /** Jios this user is hosting, going to, or queued for (public and friends-only). */
    mine(state) {
      return state.all.filter((j) => myRole(j, this.uid) !== 'none' && notEnded(j))
    },
    hosting(state) {
      return state.all.filter((j) => myRole(j, this.uid) === 'host' && notEnded(j))
    },
    going(state) {
      return state.all.filter((j) => ['going', 'queued'].includes(myRole(j, this.uid)) && notEnded(j))
    },
    /** Public jios by other people that this user hasn't joined yet. */
    openToJoin(state) {
      return state.all.filter((j) => ['public', 'friends_only'].includes(j.visibility)
        && myRole(j, this.uid) === 'none'
        && canSee(j, this.uid, this.friendIds)
        && live(j))
    },
  },

  actions: {
    /** Start the live connection. Safe to call more than once. */
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
          // Firestore stops listening after an error (e.g. after logging out),
          // so forget the old listener and let start() open a new one next time.
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
