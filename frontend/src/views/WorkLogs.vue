<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElDatePicker, ElMessage, ElTag, ElTable } from 'element-plus'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const worklogs = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const creating = ref(false)
const projects = ref([])

const form = ref({ title: '', content: '', date: new Date(), category: 'work', projectId: '', tags: '' })

const categories = [
  { value: 'work', label: '工作' },
  { value: 'study', label: '学习' },
  { value: 'meeting', label: '会议' },
  { value: 'other', label: '其他' }
]

onMounted(async () => {
  await Promise.all([loadWorklogs(), loadProjects()])
})

const loadWorklogs = async () => {
  try {
    const res = await api.get('/worklogs')
    worklogs.value = res.data
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
  form.value = { title: '', content: '', date: new Date(), category: 'work', projectId: '', tags: '' }
  dialogVisible.value = true
}

const createWorklog = async () => {
  if (!form.value.title.trim()) return
  creating.value = true
  try {
    const data = { ...form.value, tags: form.value.tags ? form.value.tags.split(',').map(t => t.trim()).filter(Boolean) : [] }
    const res = await api.post('/worklogs', data)
    worklogs.value.unshift(res.data)
    dialogVisible.value = false
    ElMessage.success('记录创建成功')
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

const deleteWorklog = async (id) => {
  try {
    await api.delete(`/worklogs/${id}`)
    worklogs.value = worklogs.value.filter(w => w.id !== id)
    ElMessage.success('已删除')
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

const getCategoryTag = (c) => ({ work: 'primary', study: 'success', meeting: 'warning', other: 'info' }[c] || 'info')
const getCategoryLabel = (c) => ({ work: '工作', study: '学习', meeting: '会议', other: '其他' }[c] || c)
const formatDate = (d) => new Date(d).toLocaleDateString('zh-CN')
</script>

<template>
  <div class="layout">
    <header class="header">
      <h2>工作记录</h2>
      <el-button type="primary" @click="openCreate">新建记录</el-button>
    </header>

    <div class="container">
      <el-table :data="worklogs" v-loading="loading" stripe>
        <el-table-column prop="date" label="日期" width="110">
          <template #default="{ row }">{{ formatDate(row.date) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150">
          <template #default="{ row }"><strong>{{ row.title }}</strong></template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="类别" width="90">
          <template #default="{ row }">
            <el-tag :type="getCategoryTag(row.category)" size="small">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="project.name" label="项目" width="120" />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="deleteWorklog(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && !worklogs.length" class="empty">
        <p>暂无工作记录</p>
        <el-button type="primary" @click="openCreate">创建第一条记录</el-button>
      </div>
    </div>

    <!-- Create dialog -->
    <el-dialog v-model="dialogVisible" title="新建工作记录" width="500px">
      <el-form @submit.prevent="createWorklog">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="记录标题" maxlength="100" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" placeholder="详细记录..." :rows="4" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="form.category" style="width:100%">
            <el-option v-for="c in categories" :key="c.value" :value="c.value" :label="c.label" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" clearable style="width:100%">
            <el-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input v-model="form.tags" placeholder="工作, 前端, bugfix" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createWorklog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: #f5f7fa; }
.header { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.header h2 { margin: 0; font-size: 18px; }
.container { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
.empty { text-align: center; padding: 48px; color: #999; }
</style>
