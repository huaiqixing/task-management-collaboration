import jwt from 'jsonwebtoken'

const DEV_MODE = true
const DEV_TOKEN = 'dev-mode-token'
const DEV_USER = { id: 'dev-user-1', name: '开发者', email: 'dev@example.com', role: 'admin' }

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  // Dev mode: accept dev token and return mock user
  if (DEV_MODE && token === DEV_TOKEN) {
    req.user = DEV_USER
    return next()
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  // Dev mode: accept dev token
  if (DEV_MODE && token === DEV_TOKEN) {
    req.user = DEV_USER
    return next()
  }

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) req.user = user
      next()
    })
  } else {
    next()
  }
}
