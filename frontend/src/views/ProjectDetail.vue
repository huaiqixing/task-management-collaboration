<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElCard, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElTag, ElTabs, ElTabPane, ElMessage, ElSkeleton } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const project = ref(null)
const loading = ref(true)
const taskDialogVisible = ref(false)
const creatingTask = ref(false)
const projectTasks = ref([])

const taskForm = ref({ title: '', description: '', priority: 'medium' })

onMounted(async () => {
  await loadProject()
  await loadTasks()
})

const loadProject = async () => {
  try {
    const res = await api.get(`/projects/${route.params.id}`)
    project.value = res.data
  } catch (err) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const loadTasks = async () => {
  try {
    const res = await api.get(`/tasks?projectId=${route.params.id}`)
    projectTasks.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const openCreateTask = () => { taskForm.value = { title: '', description: '', priority: 'medium' }; taskDialogVisible.value = true }

const createTask = async () => {
  if (!taskForm.value.title.trim()) return
  creatingTask.value = true
  try {
    const res = await api.post('/tasks', { ...taskForm.value, projectId: route.params.id })
    projectTasks.value.unshift(res.data)
    taskDialogVisible.value = false
    ElMessage.success('任务创建成功')
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    creatingTask.value = false
  }
}

const updateTaskStatus = async (taskId, status) => {
  try {
    await api.patch(`/tasks/${taskId}/status`, { status })
    const task = projectTasks.value.find(t => t.id === taskId)
    if (task) task.status = status
    ElMessage.success('状态更新')
  } catch (err) {
    ElMessage.error('更新失败')
  }
}

const getPriorityTag = (p) => ({ high: 'danger', medium: 'warning', low: 'info' }[p] || 'info')
const getPriorityLabel = (p) => ({ high: '高', medium: '中', low: '低' }[p] || p)
const getStatusTag = (s) => ({ todo: 'info', in_progress: 'warning', done: 'success', archived: 'info' }[s] || 'info')
const getStatusLabel = (s) => ({ todo: '待办', in_progress: '进行中', done: '已完成', archived: '已归档' }[s] || s)

const goBack = () => router.push('/projects')
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="header-left">
        <el-button size="small" @click="goBack">← 返回</el-button>
        <h2>{{ project?.name || '项目详情' }}</h2>
      </div>
      <el-button type="primary" size="small" @click="openCreateTask">新建任务</el-button>
    </header>

    <div class="container" v-if="!loading && project">
      <!-- Project info -->
      <el-card class="info-card">
        <div class="project-info">
          <div>
            <el-tag :type="project.status === 'active' ? 'success' : 'info'" size="small">
              {{ project.status === 'active' ? '进行中' : project.status }}
            </el-tag>
            <span class="desc" v-if="project.description">{{ project.description }}</span>
          </div>
          <div class="members">
            <span>成员：</span>
            <el-tag v-for="m in project.members" :key="m.id" size="small" style="margin-right:4px">{{ m.user?.name }}</el-tag>
          </div>
        </div>
      </el-card>

      <!-- Stats -->
      <div class="stats-row">
        <el-card class="stat-card"><strong>{{ project._count?.tasks || 0 }}</strong><span>任务</span></el-card>
        <el-card class="stat-card"><strong>{{ project._count?.workLogs || 0 }}</strong><span>记录</span></el-card>
        <el-card class="stat-card"><strong>{{ project.members?.length || 0 }}</strong><span>成员</span></el-card>
      </div>

      <!-- Tasks -->
      <el-card>
        <template #header>
          <div class="card-header"><span>任务列表</span></div>
        </template>
        <div v-if="projectTasks.length">
          <div v-for="task in projectTasks" :key="task.id" class="task-item">
            <div class="task-left">
              <el-checkbox
                :model-value="task.status === 'done'"
                @change="updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')"
              />
              <span :class="{ done: task.status === 'done' }">{{ task.title }}</span>
            </div>
            <div class="task-right">
              <el-tag :type="getPriorityTag(task.priority)" size="small">{{ getPriorityLabel(task.priority) }}</el-tag>
              <el-tag :type="getStatusTag(task.status)" size="small">{{ getStatusLabel(task.status) }}</el-tag>
            </div>
          </div>
        </div>
        <div v-else class="empty">暂无任务</div>
      </el-card>
    </div>

    <el-skeleton v-else :rows="5" animated />

    <!-- Create task dialog -->
    <el-dialog v-model="taskDialogVisible" title="新建任务" width="400px">
      <el-form @submit.prevent="createTask">
        <el-form-item label="任务标题" required>
          <el-input v-model="taskForm.title" placeholder="输入任务标题" maxlength="200" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="taskForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input v-model="taskForm.priority" placeholder="high / medium / low" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingTask" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: #f5f7fa; }
.header { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.header-left { display: flex; align-items: center; gap: 12px; }
.header h2 { margin: 0; font-size: 18px; }
.container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.info-card { margin-bottom: 16px; }
.project-info { display: flex; flex-direction: column; gap: 8px; }
.desc { color: #666; margin-left: 8px; font-size: 14px; }
.members { font-size: 13px; color: #666; margin-top: 4px; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { text-align: center; }
.stat-card strong { display: block; font-size: 28px; color: #409eff; }
.stat-card span { font-size: 13px; color: #666; }
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.task-item:last-child { border-bottom: none; }
.task-left { display: flex; align-items: center; gap: 10px; }
.task-left .done { text-decoration: line-through; color: #999; }
.task-right { display: flex; gap: 6px; }
.card-header { font-weight: 600; }
.empty { text-align: center; padding: 24px; color: #999; }
</style>
