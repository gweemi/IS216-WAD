import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthView from '@/views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/auth', name: 'auth', component: AuthView, meta: { guestOnly: true } },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { needsLogin: true },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresVerified: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

// Every page checks who is logged in before it opens.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  // Pages for verified students only.
  if (to.meta.requiresVerified) {
    if (!auth.user) return { name: 'auth', query: { redirect: to.fullPath } }
    if (!auth.verified) return { name: 'verify-email' }
  }

  // "Check your inbox" page: must be logged in, but not yet verified.
  if (to.meta.needsLogin) {
    if (!auth.user) return { name: 'auth' }
    if (auth.verified) return { name: 'home' }
  }

  // Log in / sign up page: skip it if already fully logged in.
  if (to.meta.guestOnly && auth.user && auth.verified) return { name: 'home' }

  return true
})

export default router
