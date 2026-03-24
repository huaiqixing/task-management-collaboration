import { defineStore } from 'pinia'
import api from '@/utils/api'

// 开发模式：用本地 mock user 直接跳过登录
const DEV_MODE = true
const DEV_USER = {
  id: 1,
  name: '开发者',
  email: 'dev@example.com',
  role: 'admin'
}
const DEV_TOKEN = 'dev-mode-token'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: DEV_MODE ? DEV_USER : null,
    token: DEV_MODE ? DEV_TOKEN : localStorage.getItem('token') || null,
    loading: false
  }),

  getters: {
    isLoggedIn: state => !!state.token
  },

  actions: {
    async fetchUser() {
      if (DEV_MODE) {
        this.user = DEV_USER
        return DEV_USER
      }
      if (!this.token) return null
      try {
        this.loading = true
        const res = await api.get('/auth/me')
        this.user = res.data
        return this.user
      } catch (err) {
        this.logout()
        return null
      } finally {
        this.loading = false
      }
    },

    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
    }
  }
})
