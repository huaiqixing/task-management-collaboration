<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElMessage, ElTag } from 'element-plus'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const board = ref({ todo: [], in_progress: [], done: [], archived: [] })
const loading = ref(true)
const dialogVisible = ref(false)
const creating = ref(false)
const projects = ref([])

const form = ref({ title: '', description: '', priority: 'medium', projectId: '', assigneeId: '' })

const columns = [
  { key: 'todo', label: '待办', type: 'info' },
  { key: 'in_progress', label: '进行中', type: 'warning' },
  { key: 'done', label: '已完成', type: 'success' },
  { key: 'archived', label: '已归档', type: 'info' }
]

onMounted(async () => {
  await Promise.all([loadBoard(), loadProjects()])
})

const loadBoard = async () => {
  try {
    const res = await api.get('/tasks/board')
    board.value = res.data
  } catch (err) {
    if (err.response?.status === 401) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const loadProjects = async () => {
  try {
    const res = await api.get('/projects')
    projects.value = res.data
  } catch (err) { console.error(err) }
}

const openCreate = () => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  form.value = { title: '', description: '', priority: 'medium', projectId: '', assigneeId: '' }
  dialogVisible.value = true
}

const createTask = async () => {
  if (!form.value.title.trim()) return
  creating.value = true
  try {
    const res = await api.post('/tasks', form.value)
    board.value.todo.unshift(res.data)
    dialogVisible.value = false
    ElMessage.success('任务创建成功')
  } catch (err) {
    if (err.response?.status === 401) {
      router.push('/login')
    } else {
      ElMessage.error('创建失败')
    }
  } finally {
    creating.value = false
  }
}

const moveTask = async (task, toStatus) => {
  if (task.status === toStatus) return
  try {
    await api.patch(`/tasks/${task.id}/status`, { status: toStatus })
    // Remove from current column
    board.value[task.status] = board.value[task.status].filter(t => t.id !== task.id)
    // Add to new column
    const updated = { ...task, status: toStatus }
    board.value[toStatus].unshift(updated)
    ElMessage.success('状态已更新')
  } catch (err) {
    ElMessage.error('更新失败')
  }
}

const getPriorityTag = (p) => ({ high: 'danger', medium: 'warning', low: 'info' }[p] || 'info')
const getPriorityLabel = (p) => ({ high: '高', medium: '中', low: '低' }[p] || p)
</script>

<template>
  <div class="layout">
    <header class="header">
      <h2>任务看板</h2>
      <el-button type="primary" @click="openCreate">新建任务</el-button>
    </header>

    <div class="board" v-loading="loading">
      <div v-for="col in columns" :key="col.key" class="board-column">
        <div class="column-header">
          <el-tag :type="col.type" size="small">{{ col.label }}</el-tag>
          <span class="count">{{ board[col.key]?.length || 0 }}</span>
        </div>
        <div class="column-body">
          <div v-for="task in board[col.key]" :key="task.id" class="task-card" :class="{ done: task.status === 'done' }">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <el-tag :type="getPriorityTag(task.priority)" size="small">{{ getPriorityLabel(task.priority) }}</el-tag>
              <span v-if="task.project" class="project-name">{{ task.project.name }}</span>
            </div>
            <div v-if="task.assignee" class="task-assignee">
              {{ task.assignee.name }}
            </div>
            <!-- Quick actions -->
            <div class="task-actions">
              <el-button
                v-for="col2 in columns.filter(c => c.key !== task.status)"
                :key="col2.key"
                size="mini"
                @click="moveTask(task, col2.key)"
              >→ {{ col2.label }}</el-button>
            </div>
          </div>
          <div v-if="!board[col.key]?.length" class="empty-col">暂无</div>
        </div>
      </div>
    </div>

    <!-- Create dialog -->
    <el-dialog v-model="dialogVisible" title="新建任务" width="420px">
      <el-form @submit.prevent="createTask">
        <el-form-item label="任务标题" required>
          <el-input v-model="form.title" placeholder="输入任务标题" maxlength="200" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width:100%">
            <el-option value="high" label="高" />
            <el-option value="medium" label="中" />
            <el-option value="low" label="低" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" clearable style="width:100%">
            <el-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: #f0f2f5; }
.header { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.header h2 { margin: 0; font-size: 18px; }
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px 24px; min-height: calc(100vh - 64px); overflow-x: auto; }
.board-column { background: #f5f7fa; border-radius: 8px; display: flex; flex-direction: column; min-width: 240px; }
.column-header { padding: 12px 16px; display: flex; align-items: center; gap: 8px; font-weight: 600; }
.count { background: #e0e0e0; border-radius: 10px; padding: 0 8px; font-size: 12px; color: #666; }
.column-body { flex: 1; padding: 8px 12px; overflow-y: auto; }
.task-card { background: white; border-radius: 6px; padding: 12px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.task-card.done .task-title { text-decoration: line-through; color: #999; }
.task-title { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.task-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.project-name { font-size: 12px; color: #999; }
.task-assignee { font-size: 12px; color: #666; margin-bottom: 8px; }
.task-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.empty-col { text-align: center; color: #bbb; padding: 24px; font-size: 13px; }
</style>
