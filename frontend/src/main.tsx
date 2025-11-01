import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        // 静默处理网络错误，避免未捕获的异常
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.warn('请求超时')
        } else if (error.response) {
          // 服务器返回了错误响应，这是正常的，不需要记录
          console.warn('API 错误:', error.response.status)
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.warn('网络错误: 无法连接到服务器')
        }
      },
    },
    mutations: {
      onError: (error: any) => {
        // 静默处理 mutation 错误
        if (error.response) {
          console.warn('操作失败:', error.response.status)
        }
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN}>
          <App />
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
