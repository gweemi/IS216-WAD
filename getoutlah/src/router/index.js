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
    { path: '/activities/openjio', redirect: { name: 'activities', query: { view: 'openJio' } } },
    { path: '/activities/openjio/create', redirect: { name: 'activities', query: { view: 'openJio' } } },
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
    { path: '/openjio', redirect: { name: 'activities', query: { view: 'openJio' } } },
    {
      path: '/admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { ...appRouteMeta, requiresAdmin: true },
      children: [
        { path: '', name: 'admin', redirect: { name: 'admin-activities' } },
        {
          path: 'activities',
          name: 'admin-activities',
          component: () => import('@/views/AdminActivitiesView.vue'),
        },
        {
          path: 'reports',
          name: 'admin-reports',
          component: () => import('@/views/AdminReportsView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/map' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresLogin && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresLogin && !auth.hasPreferences && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }
  if (to.name === 'onboarding' && auth.hasPreferences) return { name: 'map' }

  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'map' }

  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'map' }

  return true
})

export default router
