<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const stats = ref({ myTasks: {}, projectCount: 0, recentWorklogs: [] })
const loading = ref(true)

onMounted(async () => {
  try {
    const [taskStats, projects, worklogs] = await Promise.all([
      api.get('/tasks/stats'),
      api.get('/projects'),
      api.get('/worklogs')
    ])
    stats.value = {
      myTasks: taskStats.data,
      projectCount: projects.data.length,
      recentWorklogs: worklogs.data.slice(0, 6)
    }
  } catch (err) {
    if (err.response?.status === 401) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
})

const taskItems = [
  { key: 'todo', label: '待办', color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #60a5fa)', icon: '📋' },
  { key: 'in_progress', label: '进行中', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)', icon: '⚡' },
  { key: 'done', label: '已完成', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #34d399)', icon: '✅' },
]
</script>

<template>
  <div class="dashboard">
    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-content">
        <div class="greeting">
          <h1>👋 你好{{ authStore.user?.name ? '，' + authStore.user.name : '' }}</h1>
          <p>今天也要加油 💪</p>
        </div>
        <div class="hero-date">{{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</div>
      </div>
      <div class="hero-actions">
        <router-link to="/pricing" class="upgrade-btn">
          💎 查看定价方案
        </router-link>
      </div>
      <div class="hero-illustration">🎯</div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div
        v-for="item in taskItems"
        :key="item.key"
        class="stat-card"
        :style="{ background: item.bg }"
      >
        <div class="stat-icon">{{ item.icon }}</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.myTasks[item.key] || 0 }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </div>
      <div class="stat-card stat-card-project" style="background: linear-gradient(135deg, #8b5cf6, #a78bfa)">
        <div class="stat-icon">📁</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.projectCount }}</div>
          <div class="stat-label">项目总数</div>
        </div>
      </div>
    </div>

    <!-- Recent Worklogs -->
    <div class="section">
      <div class="section-header">
        <h2>最近工作记录</h2>
        <router-link to="/worklogs" class="more-link">查看全部 →</router-link>
      </div>
      <div class="worklog-grid" v-if="!loading && stats.recentWorklogs.length">
        <div v-for="log in stats.recentWorklogs" :key="log.id" class="worklog-card">
          <div class="worklog-icon">{{ log.category === '设计' ? '🎨' : log.category === '开发' ? '💻' : log.category === '测试' ? '🧪' : '📝' }}</div>
          <div class="worklog-body">
            <div class="worklog-title">{{ log.title }}</div>
            <div class="worklog-meta">
              <span class="worklog-cat">{{ log.category }}</span>
              <span class="worklog-time">{{ new Date(log.createdAt).toLocaleDateString('zh-CN', { month:'short', day:'numeric' }) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else-if="!loading">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无工作记录</div>
      </div>
      <div class="skeleton-grid" v-else>
        <div class="skeleton-card" v-for="i in 4" :key="i"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { padding: 32px 40px; max-width: 1200px; }

/* Hero */
.hero {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  padding: 36px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%);
  border-radius: 50%;
}
.hero-content { position: relative; z-index: 1; }
.greeting h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.greeting p { font-size: 15px; color: rgba(255,255,255,0.6); }
.hero-date { font-size: 13px; color: rgba(255,255,255,0.4); text-align: right; position: relative; z-index: 1; }
.hero-illustration { font-size: 64px; position: relative; z-index: 1; }
.hero-actions { position: relative; z-index: 1; margin-right: 20px; }
.upgrade-btn {
  display: inline-block;
  padding: 10px 20px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}
.upgrade-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}
.stat-card {
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
.stat-icon { font-size: 32px; }
.stat-value { font-size: 36px; font-weight: 700; color: #fff; line-height: 1; }
.stat-label { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; }

/* Section */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; }
.more-link { font-size: 14px; color: #6366f1; text-decoration: none; font-weight: 500; }
.more-link:hover { color: #4f46e5; }

/* Worklog grid */
.worklog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.worklog-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}
.worklog-card:hover { border-color: #e0e7ff; box-shadow: 0 4px 16px rgba(99,102,241,0.08); transform: translateY(-2px); }
.worklog-icon { font-size: 28px; }
.worklog-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; line-height: 1.4; }
.worklog-meta { display: flex; gap: 10px; align-items: center; }
.worklog-cat { font-size: 12px; background: #f0f0f7; color: #6366f1; padding: 2px 8px; border-radius: 6px; font-weight: 500; }
.worklog-time { font-size: 12px; color: #999; }

/* Empty & skeleton */
.empty-state { text-align: center; padding: 48px; background: #fff; border-radius: 16px; border: 1px solid #f0f0f0; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { color: #999; font-size: 14px; }
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.skeleton-card { height: 100px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; border-radius: 14px; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
