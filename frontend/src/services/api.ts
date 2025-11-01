import axios from 'axios'

// 获取 API 基础地址，如果未设置环境变量，使用相对路径
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 确保 API_BASE_URL 以 /api 结尾（如果设置了完整 URL）
if (API_BASE_URL.startsWith('http')) {
  // 如果是完整的 URL（包含协议），确保以 /api 结尾
  if (!API_BASE_URL.endsWith('/api')) {
    API_BASE_URL = API_BASE_URL.endsWith('/') 
      ? `${API_BASE_URL}api` 
      : `${API_BASE_URL}/api`
  }
} else if (API_BASE_URL === '/api') {
  // 相对路径，已经是 /api，不需要修改
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
    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    } catch (error) {
      // 如果 localStorage 访问失败，继续请求但不添加 token
      console.warn('无法访问 localStorage:', error)
      return config
    }
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    // 确保响应格式正确
    try {
      return response
    } catch (error) {
      console.error('响应处理错误:', error)
      return response
    }
  },
  (error) => {
    // 统一处理所有错误，避免未捕获的异常
    try {
      // 处理 401 未授权错误
      if (error.response?.status === 401) {
        try {
          localStorage.removeItem('admin_token')
        } catch (e) {
          console.warn('无法访问 localStorage:', e)
        }
        // 避免在已经登录页面时重定向
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login'
        }
      }
      // 记录错误信息（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.error('API 错误:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        })
      }
    } catch (e) {
      // 即使错误处理本身出错，也要确保返回 reject
      console.error('错误处理失败:', e)
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
