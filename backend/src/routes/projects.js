import { Router } from 'express'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
router.use(authenticateToken)

// List projects for current user
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { tasks: true, workLogs: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    res.json(projects)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, startDate, endDate } = req.body
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        ownerId: req.user.id
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } }
      }
    })

    // Add owner as member
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: req.user.id, role: 'owner' }
    })

    res.status(201).json(project)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Get project detail
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        _count: { select: { tasks: true, workLogs: true } }
      }
    })

    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Check access
    const isMember = project.members.some(m => m.userId === req.user.id)
    const isOwner = project.ownerId === req.user.id
    if (!isMember && !isOwner) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(project)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Update project
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, startDate, endDate, status } = req.body

    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can update project' })

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status
      }
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can delete project' })

    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ message: 'Project deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// List project members
router.get('/:id/members', async (req, res) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } }
      }
    })
    res.json(members)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// Add member
router.post('/:id/members', async (req, res) => {
  try {
    const { email, role = 'member' } = req.body

    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can add members' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId: user.id, role }
    })
    res.status(201).json(member)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

// Remove member
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can remove members' })
    if (req.params.userId === project.ownerId) return res.status(400).json({ error: 'Cannot remove owner' })

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } }
    })
    res.json({ message: 'Member removed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// Project stats
router.get('/:id/stats', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const tasks = await prisma.task.count({ where: { projectId: req.params.id } })
    const doneTasks = await prisma.task.count({ where: { projectId: req.params.id, status: 'done' } })
    const members = await prisma.projectMember.count({ where: { projectId: req.params.id } })

    res.json({
      totalTasks: tasks,
      doneTasks,
      progress: tasks > 0 ? Math.round((doneTasks / tasks) * 100) : 0,
      memberCount: members
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
