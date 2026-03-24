import { Router } from 'express'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
router.use(authenticateToken)

// List worklogs
router.get('/', async (req, res) => {
  try {
    const { dateFrom, dateTo, category, projectId } = req.query
    const where = { userId: req.user.id }

    if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
    if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }
    if (category) where.category = category
    if (projectId) where.projectId = projectId

    const workLogs = await prisma.workLog.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { date: 'desc' }
    })
    res.json(workLogs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch worklogs' })
  }
})

// Calendar view data
router.get('/calendar', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query
    const where = { userId: req.user.id }

    if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
    if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }

    const workLogs = await prisma.workLog.findMany({
      where,
      select: {
        id: true,
        title: true,
        date: true,
        category: true
      },
      orderBy: { date: 'desc' }
    })

    // Group by date
    const grouped = {}
    for (const log of workLogs) {
      const key = log.date.toISOString().split('T')[0]
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(log)
    }
    res.json(grouped)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch calendar data' })
  }
})

// Worklog stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const [weekLogs, monthLogs, byCategory] = await Promise.all([
      prisma.workLog.count({ where: { userId: req.user.id, date: { gte: weekAgo } } }),
      prisma.workLog.count({ where: { userId: req.user.id, date: { gte: monthAgo } } }),
      prisma.workLog.groupBy({
        by: ['category'],
        where: { userId: req.user.id },
        _count: true
      })
    ])

    const categoryStats = {}
    for (const c of byCategory) {
      categoryStats[c.category] = c._count
    }

    res.json({ weekLogs, monthLogs, categoryStats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Create worklog
router.post('/', async (req, res) => {
  try {
    const { title, content, date, category, tags, projectId, taskId } = req.body

    const workLog = await prisma.workLog.create({
      data: {
        userId: req.user.id,
        title,
        content,
        date: date ? new Date(date) : new Date(),
        category: category || 'work',
        tags: tags || [],
        projectId,
        taskId
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      }
    })
    res.status(201).json(workLog)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create worklog' })
  }
})

// Get worklog detail
router.get('/:id', async (req, res) => {
  try {
    const workLog = await prisma.workLog.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      }
    })
    if (!workLog) return res.status(404).json({ error: 'Worklog not found' })
    if (workLog.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' })
    res.json(workLog)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch worklog' })
  }
})

// Update worklog
router.patch('/:id', async (req, res) => {
  try {
    const { title, content, date, category, tags, projectId, taskId } = req.body

    const workLog = await prisma.workLog.findUnique({ where: { id: req.params.id } })
    if (!workLog) return res.status(404).json({ error: 'Worklog not found' })
    if (workLog.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' })

    const updated = await prisma.workLog.update({
      where: { id: req.params.id },
      data: { title, content, date: date ? new Date(date) : undefined, category, tags, projectId, taskId }
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update worklog' })
  }
})

// Delete worklog
router.delete('/:id', async (req, res) => {
  try {
    const workLog = await prisma.workLog.findUnique({ where: { id: req.params.id } })
    if (!workLog) return res.status(404).json({ error: 'Worklog not found' })
    if (workLog.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' })

    await prisma.workLog.delete({ where: { id: req.params.id } })
    res.json({ message: 'Worklog deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete worklog' })
  }
})

export default router
