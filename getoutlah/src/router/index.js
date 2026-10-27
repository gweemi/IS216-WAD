import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthView from '@/views/AuthView.vue'
import ActivitiesView from '@/views/ActivitiesView.vue'
import ActivityDetailView from '@/views/ActivityDetailView.vue'
import MapView from '@/views/MapView.vue'
import BadgesView from '@/views/BadgesView.vue'
import MyFeaturesTestView from '@/views/MyFeaturesTestView.vue'
import ProfileView from '@/views/ProfileView.vue'
import RoutePlaceholderView from '@/views/RoutePlaceholderView.vue'

const appRouteMeta = { requiresLogin: true, appNavigation: true }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/map' },
    { path: '/auth', name: 'auth', component: AuthView, meta: { guestOnly: true } },
    {
      // New-user questionnaire (interests, budget, energy, solo/group).
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresLogin: true },
    },
    {
      path: '/map',
      name: 'map',
      component: MapView,
      meta: { ...appRouteMeta, mapLayout: true },
    },
    { path: '/home', redirect: '/map' },
    {
      path: '/activities',
      name: 'activities',
      component: ActivitiesView,
      meta: appRouteMeta,
    },
    {
      path: '/activities/:id',
      name: 'activity',
      component: ActivityDetailView,
      meta: appRouteMeta,
    },
    {
      path: '/friends',
      name: 'friends',
      component: RoutePlaceholderView,
      props: { title: 'Friends', icon: 'bi-people' },
      meta: appRouteMeta,
    },
    { path: '/badges', name: 'badges', component: BadgesView, meta: appRouteMeta },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: appRouteMeta,
    },
    {
      path: '/test-my-features',
      name: 'test-my-features',
      component: MyFeaturesTestView,
      meta: { requiresLogin: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/map' },
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
  if (to.name === 'onboarding' && auth.hasPreferences) return { name: 'map' }

  // Log-in page: skip it if already logged in.
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'map' }

  return true
})

export default router
