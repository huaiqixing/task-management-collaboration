import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const IS_DEV_MODE = !CLIENT_ID || CLIENT_ID === 'your-google-client-id.apps.googleusercontent.com'

// Google OAuth login
router.get('/google', async (req, res) => {
  if (IS_DEV_MODE) {
    // Dev mode: skip Google, create/use a test user directly
    const testUser = await prisma.user.upsert({
      where: { email: 'dev@test.local' },
      update: {},
      create: {
        email: 'dev@test.local',
        name: 'Dev User',
        googleId: 'dev-google-id-123'
      }
    })

    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, name: testUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Redirect to frontend with token
    return res.redirect(`http://localhost:5173/auth/callback?token=${token}`)
  }

  // Production: redirect to Google
  const client = new OAuth2Client(CLIENT_ID)
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  })

  res.redirect(authUrl)
})

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  if (IS_DEV_MODE) {
    return res.redirect(`http://localhost:5173/auth/callback?token=dummy`)
  }

  const { code } = req.query
  const client = new OAuth2Client(CLIENT_ID)

  try {
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID
    })

    const payload = ticket.getPayload()
    const { email, name, sub: googleId } = payload

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, googleId }
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Redirect to frontend
    res.redirect(`https://task-management-5sg.pages.dev/auth/callback?token=${token}`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.redirect(`https://task-management-5sg.pages.dev/login?error=auth_failed`)
  }
})

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, avatar: true, role: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update current user
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, avatar },
      select: { id: true, email: true, name: true, avatar: true, role: true }
    })
    res.json(user)
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
