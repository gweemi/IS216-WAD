// Who is logged in, shared across the whole app (Pinia store).
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'

let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Firebase user (kept raw so Vue doesn't wrap Firebase internals)
    ready: false, // true once Firebase has told us whether someone is logged in
  }),

  getters: {
    email: (state) => state.user?.email ?? '',
    isLoggedIn: (state) => Boolean(state.user),
  },

  actions: {
    /** Start listening to Firebase once. Resolves after the first check. */
    init() {
      if (!readyPromise) {
        readyPromise = new Promise((resolve) => {
          onAuthStateChanged(auth, (user) => {
            this.user = user ? markRaw(user) : null
            if (!this.ready) {
              this.ready = true
              resolve()
            }
          })
        })
      }
      return readyPromise
    },

    /** Update straight away after signing in, without waiting for Firebase's listener. */
    setUser(user) {
      this.user = user ? markRaw(user) : null
    },
  },
})
