import { Router } from 'express'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
router.use(authenticateToken)

// List notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notifications)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })
    res.json({ message: 'Marked as read' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    })
    res.json({ message: 'All marked as read' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
})

export default router
