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
      // 注意：在新版本的 @tanstack/react-query 中，onError 不能直接放在 defaultOptions 中
      // 错误处理将在各个 useQuery 中单独处理
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
