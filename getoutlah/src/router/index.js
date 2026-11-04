import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LandingView from '@/views/LandingView.vue'
import LoginView from '@/views/LoginView.vue'
import InformationPageView from '@/views/InformationPageView.vue'
import ActivitiesView from '@/views/ActivitiesView.vue'
import ActivityDetailView from '@/views/ActivityDetailView.vue'
import MapView from '@/views/MapView.vue'
import BadgesView from '@/views/BadgesView.vue'
import ProfileView from '@/views/ProfileView.vue'

const appRouteMeta = { requiresLogin: true, appNavigation: true }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: LandingView, meta: { guestOnly: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/auth', redirect: '/login' },
    { path: '/privacy', name: 'privacy', component: InformationPageView, meta: { page: 'privacy' } },
    { path: '/terms', name: 'terms', component: InformationPageView, meta: { page: 'terms' } },
    { path: '/guidelines', name: 'guidelines', component: InformationPageView, meta: { page: 'guidelines' } },
    { path: '/about', name: 'about', component: InformationPageView, meta: { page: 'about' } },
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
      path: '/activities/openjio',
      name: 'openjio',
      component: () => import('@/views/OpenJioView.vue'),
      meta: appRouteMeta,
    },
    {
      path: '/activities/openjio/create',
      name: 'openjio-create',
      component: () => import('@/views/OpenJioCreateView.vue'),
      meta: appRouteMeta,
    },
    {
      path: '/activities/openjio/:id/edit',
      name: 'openjio-edit',
      component: () => import('@/views/OpenJioEditView.vue'),
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
      component: () => import('@/views/FriendsView.vue'),
      meta: appRouteMeta,
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: appRouteMeta,
    },
    { path: '/badges', name: 'badges', component: BadgesView, meta: appRouteMeta },
    { path: '/badges/vouchers', name: 'vouchers', component: () => import('@/views/VouchersView.vue'), meta: appRouteMeta },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: appRouteMeta,
    },
    { path: '/openjio', redirect: { name: 'openjio' } },
    {
      // Admin only. One page with a tab per tool; add new tools as children here.
      // Firestore rules are the real lock, this only keeps non-admins off the page.
      path: '/admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { ...appRouteMeta, requiresAdmin: true },
      children: [
        { path: '', name: 'admin', redirect: { name: 'admin-activities' } },
        {
          // Eventbrite organisers + sync, and curated activities.
          path: 'activities',
          name: 'admin-activities',
          component: () => import('@/views/AdminActivitiesView.vue'),
        },
        {
          // Reported OpenJios waiting for an admin to restore or remove them.
          path: 'reports',
          name: 'admin-reports',
          component: () => import('@/views/AdminReportsView.vue'),
        },
      ],
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
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // New users must answer the questionnaire before using the app...
  if (to.meta.requiresLogin && !auth.hasPreferences && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }
  // ...and only see it once.
  if (to.name === 'onboarding' && auth.hasPreferences) return { name: 'map' }

  // Admin pages: everyone else goes back to the map.
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'map' }

  // Log-in page: skip it if already logged in.
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'map' }

  return true
})

export default router
