import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthView from '@/views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/auth', name: 'auth', component: AuthView, meta: { guestOnly: true } },
    {
      // New-user questionnaire (interests, budget, energy, solo/group).
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresLogin: true },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresLogin: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

// Every page checks who is logged in before it opens.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  // Pages for logged-in users only.
  if (to.meta.requiresLogin && !auth.isLoggedIn) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }

  // New users must answer the questionnaire before using the app...
  if (to.meta.requiresLogin && !auth.hasPreferences && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }
  // ...and only see it once.
  if (to.name === 'onboarding' && auth.hasPreferences) return { name: 'home' }

  // Log-in page: skip it if already logged in.
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'home' }

  return true
})

export default router
