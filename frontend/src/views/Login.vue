<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const API_BASE = import.meta.env.VITE_API_BASE || 'https://nanophoto.store/api'

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const error = params.get('error')

  if (error) {
    alert('登录失败: ' + error)
    router.push('/login')
    return
  }

  if (token) {
    authStore.setToken(token)
    await authStore.fetchUser()
    router.push('/dashboard')
  }
})

function goGithubLogin() {
  window.location.href = `${API_BASE}/auth/github`
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>任务协作平台</h1>
      <p>使用 GitHub 账号一键登录</p>
      <el-button type="primary" size="large" @click="goGithubLogin">
        使用 GitHub 登录
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.login-card {
  background: white;
  padding: 48px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  text-align: center;
}
.login-card h1 { margin-bottom: 8px; color: #333; }
.login-card p { margin-bottom: 24px; color: #666; }
</style>
