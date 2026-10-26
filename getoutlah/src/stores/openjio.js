// The live list of OPENJIOs, shared across the app (Pinia store).
// The OpenJio page uses it, and the map can use it for OpenJio markers:
//   const jios = useOpenJioStore(); jios.start(); jios.visible
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { watchJios, friendlyJioError } from '@/services/openjio'
import { canSee, myRole, statusOf } from '@/utils/openjio'

let stopListening = null

export const useOpenJioStore = defineStore('openjio', {
  state: () => ({
    all: [], // every upcoming jio from Firestore, soonest first
    loading: false,
    error: '',
  }),

  getters: {
    /** The current user's friends. Comes from the Friends feature (users/{uid}.friendIds). */
    friendIds() {
      return useAuthStore().profile?.friendIds ?? []
    },
    uid() {
      return useAuthStore().user?.uid ?? null
    },
    /** Jios this user is allowed to see (public, or friends-only from a friend). */
    visible(state) {
      return state.all.filter((j) => canSee(j, this.uid, this.friendIds))
    },
    /** Jios this user is hosting, going to, or queued for. */
    mine() {
      return this.visible.filter((j) => myRole(j, this.uid) !== 'none')
    },
    /** Hide ended jios from the main list. */
    upcoming() {
      return this.visible.filter((j) => statusOf(j) !== 'ended')
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
