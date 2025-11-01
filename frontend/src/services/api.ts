import axios from 'axios'

// 获取 API 基础地址，如果未设置环境变量，使用相对路径
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 如果是相对路径且没有协议，说明是生产环境但环境变量未设置
if (API_BASE_URL === '/api') {
  console.warn('警告: VITE_API_BASE_URL 环境变量未设置，使用相对路径 /api')
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // 添加请求配置，防止 CORS 错误
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      // 避免在已经登录页面时重定向
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login'
      }
    }
    // 确保所有错误都被正确捕获，避免未捕获的异常
    return Promise.reject(error)
  }
)

// 认证相关API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/admin/login', { username, password }),
  register: (username: string, password: string) =>
    api.post('/admin/register', { username, password }),
}

// 内容管理API
export const contentAPI = {
  // 管理员接口
  createContent: (data: { images: string[]; caption: string }) =>
    api.post('/admin/content', data),
  getContents: () => api.get('/admin/content'),
  deleteContent: (id: string) => api.delete(`/admin/content/${id}`),
  getStats: () => api.get('/admin/stats'),
  
  // 用户接口
  claimContent: () => api.get('/content/claim'),
  getContentCount: () => api.get('/content/count'),
}

// 上传API
export const uploadAPI = {
  getPresignedUrl: (filename: string, contentType: string) =>
    api.post('/upload/presigned-url', { filename, contentType }),
}

export default api
