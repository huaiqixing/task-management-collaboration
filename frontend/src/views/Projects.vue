<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElMessage, ElTable, ElTag } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const projects = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const creating = ref(false)

const form = ref({ name: '', description: '' })

onMounted(async () => {
  try {
    const res = await api.get('/projects')
    projects.value = res.data
  } catch (err) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
})

const openCreate = () => { form.value = { name: '', description: '' }; dialogVisible.value = true }

const createProject = async () => {
  if (!form.value.name.trim()) return
  creating.value = true
  try {
    const res = await api.post('/projects', form.value)
    projects.value.unshift(res.data)
    dialogVisible.value = false
    ElMessage.success('项目创建成功')
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    creating.value = false
  }
}

const goProject = (id) => router.push(`/projects/${id}`)
const getStatusType = (s) => ({ active: 'success', completed: 'info', archived: 'warning' }[s] || 'info')
const getStatusLabel = (s) => ({ active: '进行中', completed: '已完成', archived: '已归档' }[s] || s)
</script>

<template>
  <div class="layout">
    <header class="header">
      <h2>项目列表</h2>
      <el-button type="primary" @click="openCreate">新建项目</el-button>
    </header>

    <div class="container">
      <el-table :data="projects" v-loading="loading" @row-click="goProject" stripe>
        <el-table-column prop="name" label="项目名称" min-width="150">
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="_count.tasks" label="任务数" width="80" align="center" />
        <el-table-column prop="_count.workLogs" label="记录数" width="80" align="center" />
        <el-table-column prop="owner.name" label="负责人" width="100" />
      </el-table>

      <div v-if="!loading && !projects.length" class="empty">
        <p>暂无项目</p>
        <el-button type="primary" @click="openCreate">创建第一个项目</el-button>
      </div>
    </div>

    <!-- Create dialog -->
    <el-dialog v-model="dialogVisible" title="新建项目" width="400px">
      <el-form @submit.prevent="createProject">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.name" placeholder="输入项目名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="项目描述（可选）" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createProject">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: #f5f7fa; }
.header { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.header h2 { margin: 0; font-size: 18px; }
.container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
.empty { text-align: center; padding: 48px; color: #999; }
</style>
