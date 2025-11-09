import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 使用默认压缩（esbuild，更稳定）
    minify: 'esbuild',
    // 代码分割优化（简化配置，避免运行时错误）
    rollupOptions: {
      output: {
        // 手动分割代码，减少首次加载大小
        manualChunks: (id) => {
          // 将 node_modules 中的包单独打包
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('antd')) {
              return 'antd-vendor'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor'
            }
            // 其他第三方库
            return 'vendor'
          }
        },
      },
    },
    // 启用 gzip 压缩报告
    reportCompressedSize: true,
    // 设置 chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true, // 允许局域网/手机访问
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 后端服务地址
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
