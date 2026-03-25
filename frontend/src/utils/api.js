import axios from 'axios'

const DEV_MODE = true
const DEV_TOKEN = 'dev-mode-token'

const api = axios.create({
  baseURL: 'https://118.25.177.169/api',
  timeout: 10000
})

// Attach JWT token
api.interceptors.request.use(config => {
  const token = DEV_MODE ? DEV_TOKEN : localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (!DEV_MODE && err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
