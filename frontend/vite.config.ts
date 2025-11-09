import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 使用默认压缩（esbuild，更稳定）
    minify: 'esbuild',
    // 代码分割优化（确保 React 和依赖它的库在同一个 chunk）
    rollupOptions: {
      output: {
        // 手动分割代码，确保依赖顺序正确
        manualChunks: (id) => {
          // 将 node_modules 中的包单独打包
          if (id.includes('node_modules')) {
            // React 和所有依赖 React 的库放在一起，确保加载顺序
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-router') ||
              id.includes('antd') ||
              id.includes('@tanstack/react-query')
            ) {
              return 'react-vendor'
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
