<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElSkeleton, ElButton } from 'element-plus'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

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
      recentWorklogs: worklogs.data.slice(0, 5)
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

const getTaskStatusLabel = (s) => ({ todo: '待办', in_progress: '进行中', done: '已完成' }[s] || s)
const getTaskStatusType = (s) => ({ todo: 'info', in_progress: 'warning', done: 'success' }[s] || 'info')
</script>

<template>
  <div class="layout">
    <!-- Header -->
    <header class="header">
      <h2>任务协作平台</h2>
      <div class="header-right">
        <span>{{ authStore.user?.name || 'User' }}</span>
        <el-button size="small" @click="authStore.logout(); router.push('/login')">退出</el-button>
      </div>
    </header>

    <div class="container">
      <!-- Quick nav -->
      <div class="quick-nav">
        <el-card shadow="hover" @click="router.push('/projects')" class="nav-card">
          <h3>📁 项目</h3>
          <p>{{ stats.projectCount }} 个项目</p>
        </el-card>
        <el-card shadow="hover" @click="router.push('/tasks')" class="nav-card">
          <h3>✅ 任务</h3>
          <p>{{ stats.myTasks.total || 0 }} 个任务</p>
        </el-card>
        <el-card shadow="hover" @click="router.push('/worklogs')" class="nav-card">
          <h3>📝 工作记录</h3>
          <p>查看记录</p>
        </el-card>
      </div>

      <!-- Task summary -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>我的任务</span>
            <el-button size="small" @click="router.push('/tasks')">查看全部</el-button>
          </div>
        </template>
        <div class="task-summary" v-if="!loading">
          <div class="task-stat">
            <span class="label">待办</span>
            <span class="value info">{{ stats.myTasks.todo || 0 }}</span>
          </div>
          <div class="task-stat">
            <span class="label">进行中</span>
            <span class="value warning">{{ stats.myTasks.in_progress || 0 }}</span>
          </div>
          <div class="task-stat">
            <span class="label">已完成</span>
            <span class="value success">{{ stats.myTasks.done || 0 }}</span>
          </div>
        </div>
        <el-skeleton v-else :rows="1" animated />
      </el-card>

      <!-- Recent worklogs -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span>最近工作记录</span>
            <el-button size="small" @click="router.push('/worklogs')">查看全部</el-button>
          </div>
        </template>
        <div v-if="!loading">
          <div v-for="log in stats.recentWorklogs" :key="log.id" class="worklog-item">
            <span class="worklog-title">{{ log.title }}</span>
            <el-tag size="small" type="info">{{ log.category }}</el-tag>
          </div>
          <div v-if="!stats.recentWorklogs.length" class="empty">暂无记录</div>
        </div>
        <el-skeleton v-else :rows="3" animated />
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: #f5f7fa; }
.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.header h2 { margin: 0; font-size: 18px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.quick-nav { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.nav-card { cursor: pointer; text-align: center; }
.nav-card h3 { margin: 0 0 8px; font-size: 16px; }
.nav-card p { margin: 0; color: #666; font-size: 13px; }
.section-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.task-summary { display: flex; gap: 32px; }
.task-stat { text-align: center; }
.task-stat .label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
.task-stat .value { font-size: 28px; font-weight: bold; }
.value.info { color: #409eff; }
.value.warning { color: #e6a23c; }
.value.success { color: #67c23a; }
.worklog-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.worklog-item:last-child { border-bottom: none; }
.worklog-title { font-size: 14px; }
.empty { color: #999; text-align: center; padding: 16px; }
</style>
