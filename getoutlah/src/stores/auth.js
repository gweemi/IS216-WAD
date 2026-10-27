// Who is logged in, shared across the whole app (Pinia store).
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { PREFERENCES_VERSION } from '@/config/preferences'

let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Firebase user (kept raw so Vue doesn't wrap Firebase internals)
    profile: null, // their document from Firestore: users/{uid}
    ready: false, // true once Firebase has told us whether someone is logged in
  }),

  getters: {
    email: (state) => state.user?.email ?? '',
    isLoggedIn: (state) => Boolean(state.user),
    /** Has this user finished the new-user questionnaire? */
    hasPreferences: (state) =>
      Boolean(state.profile?.preferences) && state.profile?.preferencesVersion === PREFERENCES_VERSION,
    /** The questionnaire answers, or null. See PREFERENCES.md. */
    preferences: (state) => state.profile?.preferences ?? null,
  },

  actions: {
    /** Start listening to Firebase once. Resolves after the first check. */
    init() {
      if (!readyPromise) {
        readyPromise = new Promise((resolve) => {
          onAuthStateChanged(auth, async (user) => {
            this.user = user ? markRaw(user) : null
            this.profile = user ? await this.fetchProfile(user.uid) : null
            if (!this.ready) {
              this.ready = true
              resolve()
            }
          })
        })
      }
      return readyPromise
    },

    async fetchProfile(uid) {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        return snap.exists() ? snap.data() : null
      } catch {
        return null
      }
    },

    /** Update straight away after signing in, without waiting for Firebase's listener. */
    setUser(user) {
      this.user = user ? markRaw(user) : null
      if (!user) this.profile = null
    },

    setProfile(profile) {
      this.profile = profile
    },
  },
})
