import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { PREFERENCES_VERSION } from '@/config/preferences'

let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    ready: false,
    mapIntroPending: false,
    badgeWelcomePending: false,
  }),

  getters: {
    email: (state) => state.user?.email ?? '',
    isLoggedIn: (state) => Boolean(state.user),
    hasPreferences: (state) =>
      Boolean(state.profile?.preferences) && state.profile?.preferencesVersion === PREFERENCES_VERSION,
    preferences: (state) => state.profile?.preferences ?? null,
    isAdmin: (state) => state.profile?.role === 'admin',
  },

  actions: {
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

    setUser(user) {
      this.user = user ? markRaw(user) : null
      if (!user) {
        this.profile = null
        this.mapIntroPending = false
        this.badgeWelcomePending = false
      }
    },

    queueMapIntro() {
      this.mapIntroPending = true
    },

    queueBadgeWelcome() { this.badgeWelcomePending = true },
    consumeBadgeWelcome() {
      const pending = this.badgeWelcomePending
      this.badgeWelcomePending = false
      return pending
    },

    consumeMapIntro() {
      const pending = this.mapIntroPending
      this.mapIntroPending = false
      return pending
    },

    setProfile(profile) {
      this.profile = profile
    },
  },
})
