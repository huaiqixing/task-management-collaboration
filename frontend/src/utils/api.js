import axios from 'axios'

const api = axios.create({
  baseURL: 'https://nanophoto.store/api',
  timeout: 10000
})

// Attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 - just reject, don't auto redirect
api.interceptors.response.use(
  res => res,
  err => Promise.reject(err)
)

export default api
