import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/clock', component: () => import('@/views/ClockPage.vue') },
    {
      path: '/login',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/auth/callback',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects',
      component: () => import('@/views/Projects.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:id',
      component: () => import('@/views/ProjectDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tasks',
      component: () => import('@/views/Tasks.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/worklogs',
      component: () => import('@/views/WorkLogs.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/pricing',
      component: () => import('@/views/Pricing.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.token) {
      next('/login')
      return
    }
    // Token exists but user not loaded - fetch user
    if (!authStore.user) {
      await authStore.fetchUser()
      if (!authStore.user) {
        next('/login')
        return
      }
    }
  }

  if ((to.path === '/login' || to.path === '/auth/callback') && authStore.token) {
    if (!authStore.user) {
      await authStore.fetchUser()
    }
    if (authStore.user) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
