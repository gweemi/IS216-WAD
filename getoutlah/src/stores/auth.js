// Who is logged in, shared across the whole app (Pinia store).
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'

let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Firebase user (kept raw so Vue doesn't wrap Firebase internals)
    email: '',
    verified: false, // has the user clicked the link in their school inbox?
    ready: false, // true once Firebase has told us whether someone is logged in
  }),

  actions: {
    /** Start listening to Firebase once. Resolves after the first check. */
    init() {
      if (!readyPromise) {
        readyPromise = new Promise((resolve) => {
          onAuthStateChanged(auth, (user) => {
            this.sync(user)
            if (!this.ready) {
              this.ready = true
              resolve()
            }
          })
        })
      }
      return readyPromise
    },

    sync(user) {
      this.user = user ? markRaw(user) : null
      this.email = user?.email ?? ''
      this.verified = Boolean(user?.emailVerified)
    },

    /** Re-read the current user, e.g. after user.reload() picks up a verified email. */
    refresh() {
      this.sync(auth.currentUser)
    },
  },
})
