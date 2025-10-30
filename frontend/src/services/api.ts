import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
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
