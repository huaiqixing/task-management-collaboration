<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const collapsed = ref(false)

const navItems = [
  { path: '/dashboard', label: '工作台', icon: '🏠' },
  { path: '/projects', label: '项目管理', icon: '📁' },
  { path: '/tasks', label: '任务管理', icon: '✅' },
  { path: '/worklogs', label: '工作记录', icon: '📝' },
  { path: '/pricing', label: '💎 定价', icon: '💎' },
]

const isActive = (path) => route.path === path || (path !== '/dashboard' && route.path.startsWith(path))

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const sidebarUser = computed(() => {
  if (!authStore.user) return { name: '游客', role: '' }
  return {
    name: authStore.user.name || '用户',
    role: authStore.user.role === 'admin' ? '管理员' : '成员'
  }
})
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="logo">
        <span class="logo-icon">🚀</span>
        <span v-if="!collapsed" class="logo-text">TaskHub</span>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" v-if="!collapsed">
          <div class="user-avatar">{{ sidebarUser.name[0] }}</div>
          <div class="user-detail">
            <div class="user-name">{{ sidebarUser.name }}</div>
            <div class="user-role" v-if="sidebarUser.role">{{ sidebarUser.role }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" :title="collapsed ? '退出' : ''">
          🚪 <span v-if="!collapsed">退出登录</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', 'Noto Sans SC', -apple-system, sans-serif;
  background: #f0f2f5;
  color: #1a1a2e;
  -webkit-font-smoothing: antialiased;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
}
.sidebar.collapsed { width: 72px; }

.logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.logo-icon { font-size: 28px; }
.logo-text { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }

.nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
.nav-item.active { background: rgba(99,102,241,0.3); color: #fff; box-shadow: 0 0 20px rgba(99,102,241,0.2); }
.nav-icon { font-size: 18px; }
.nav-label { white-space: nowrap; }

.sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.user-avatar {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px;
}
.user-name { font-size: 13px; font-weight: 600; color: #fff; }
.user-role { font-size: 11px; color: rgba(255,255,255,0.5); }

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: none;
  border-radius: 8px;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover { background: rgba(255,82,82,0.15); color: #ff5252; }

/* Main */
.main {
  flex: 1;
  margin-left: 240px;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}
</style>
