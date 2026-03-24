import { Router } from 'express'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
router.use(authenticateToken)

// List tasks
router.get('/', async (req, res) => {
  try {
    const { projectId, assigneeId, status, priority } = req.query
    const where = {}

    if (projectId) where.projectId = projectId
    if (assigneeId) where.assigneeId = assigneeId
    if (status) where.status = status
    if (priority) where.priority = priority

    // Filter: tasks I created or I'm assigned to, or project I'm a member of
    where.OR = [
      { creatorId: req.user.id },
      { assigneeId: req.user.id },
      { project: { members: { some: { userId: req.user.id } } } }
    ]

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    res.json(tasks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Board view (grouped by status)
router.get('/board', async (req, res) => {
  try {
    const { projectId } = req.query
    const where = {
      OR: [
        { creatorId: req.user.id },
        { assigneeId: req.user.id },
        { project: { members: { some: { userId: req.user.id } } } }
      ]
    }
    if (projectId) where.OR = [{ ...where.OR[0], projectId }, { ...where.OR[1], projectId }, { ...where.OR[2], projectId }]

    const tasks = await prisma.task.findMany({
      where: where.OR ? where : { creatorId: req.user.id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const board = {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done'),
      archived: tasks.filter(t => t.status === 'archived')
    }
    res.json(board)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch board' })
  }
})

// Task stats
router.get('/stats', async (req, res) => {
  try {
    const where = {
      OR: [
        { creatorId: req.user.id },
        { assigneeId: req.user.id }
      ]
    }

    const [total, todo, in_progress, done] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'todo' } }),
      prisma.task.count({ where: { ...where, status: 'in_progress' } }),
      prisma.task.count({ where: { ...where, status: 'done' } })
    ])

    res.json({ total, todo, in_progress, done })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Create task
router.post('/', async (req, res) => {
  try {
    const { projectId, title, description, priority, dueDate, assigneeId } = req.body

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        priority: priority || 'medium',
        status: 'todo',
        assigneeId,
        creatorId: req.user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } }
      }
    })

    // Notify assignee
    if (assigneeId && assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'task_assigned',
          title: '新任务已指派给你',
          content: `任务「${title}」已指派给你`,
          relatedId: task.id
        }
      })
    }

    res.status(201).json(task)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Get task detail
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        workLogs: { include: { user: { select: { name: true } } } }
      }
    })
    if (!task) return res.status(404).json({ error: 'Task not found' })
    res.json(task)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch task' })
  }
})

// Update task
router.patch('/:id', async (req, res) => {
  try {
    const { title, description, priority, dueDate, assigneeId } = req.body

    const task = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { title, description, priority, dueDate: dueDate ? new Date(dueDate) : undefined, assigneeId }
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const data = { status }

    if (status === 'done') {
      data.completedAt = new Date()
    } else {
      data.completedAt = null
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } }
      }
    })
    res.json(task)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ message: 'Task deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

export default router
