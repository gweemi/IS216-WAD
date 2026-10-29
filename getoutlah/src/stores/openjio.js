// The live list of OPENJIOs, shared across the app (Pinia store).
//   const jios = useOpenJioStore(); jios.start()
//   jios.publicUpcoming → for the Activities list and the map
//   jios.invites        → friends-only jios this user was invited to
//   jios.mine           → jios this user hosts, joined or choped
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { watchJios, friendlyJioError } from '@/services/openjio'
import { canSee, myRole, isInvited, statusOf } from '@/utils/openjio'

let stopListening = null

const notEnded = (j) => statusOf(j) !== 'ended'

export const useOpenJioStore = defineStore('openjio', {
  state: () => ({
    all: [], // every upcoming jio from Firestore, soonest first
    loading: false,
    error: '',
  }),

  getters: {
    uid() {
      return useAuthStore().user?.uid ?? null
    },
    /** The user's friends (users/{uid}.friendIds), for the invite list. */
    friendIds() {
      return useAuthStore().profile?.friendIds ?? []
    },
    /** Every jio this user is allowed to see. */
    visible(state) {
      return state.all.filter((j) => canSee(j, this.uid))
    },
    /** Public jios that haven't ended. Shown on the Activities page next to events. */
    publicUpcoming(state) {
      return state.all.filter((j) => j.visibility === 'public' && notEnded(j))
    },
    /** Friends-only jios this user was invited to but hasn't joined yet. */
    invites(state) {
      return state.all.filter(
        (j) =>
          j.visibility === 'friends' &&
          isInvited(j, this.uid) &&
          myRole(j, this.uid) === 'none' &&
          j.status !== 'cancelled' &&
          notEnded(j),
      )
    },
    /** Jios this user is hosting, going to, or queued for (public and friends-only). */
    mine(state) {
      return state.all.filter((j) => myRole(j, this.uid) !== 'none' && notEnded(j))
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
