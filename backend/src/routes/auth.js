import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../services/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const IS_DEV_MODE = !CLIENT_ID || CLIENT_ID === 'your-google-client-id.apps.googleusercontent.com'
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

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
router.get('/callback/google', async (req, res) => {
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
    res.redirect(`https://nanophoto.store/auth/callback?token=${token}`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.redirect(`https://nanophoto.store/login?error=auth_failed`)
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

// ============ GitHub OAuth ============

// GitHub OAuth login
router.get('/github', async (req, res) => {
  const redirectUri = `https://nanophoto.store/api/auth/callback/github`
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`
  res.redirect(authUrl)
})

// GitHub OAuth callback
router.get('/callback/github', async (req, res) => {
  const { code } = req.query
  if (!code) {
    return res.redirect(`https://nanophoto.store/login?error=auth_failed`)
  }

  try {
    // 1. 用 code 换 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('GitHub OAuth: no access token', tokenData)
      return res.redirect(`https://nanophoto.store/login?error=auth_failed`)
    }

    // 2. 用 access_token 获取用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    const githubUser = await userRes.json()

    // 3. 获取用户邮箱（如果没在上面的请求里返回）
    let email = githubUser.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      const emails = await emailsRes.json()
      const primaryEmail = emails.find(e => e.primary && e.verified)
      email = primaryEmail ? primaryEmail.email : (emails[0]?.email || `${githubUser.login}@github.local`)
    }

    // 4. 查找或创建用户
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: githubUser.name || githubUser.login,
          avatar: githubUser.avatar_url,
          githubId: String(githubUser.id)
        }
      })
    }

    // 5. 生成 JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    // 6. 重定向到前端
    res.redirect(`https://nanophoto.store/auth/callback?token=${token}`)
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    res.redirect(`https://nanophoto.store/login?error=auth_failed`)
  }
})

export default router
