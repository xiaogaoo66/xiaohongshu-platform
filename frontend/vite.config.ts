import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 启用压缩（生产环境）
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
    // 代码分割优化
    rollupOptions: {
      output: {
        // 手动分割代码，减少首次加载大小
        manualChunks: {
          // 将 React 相关库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将 Ant Design 单独打包（通常较大）
          'antd-vendor': ['antd'],
          // 将其他第三方库打包
          'vendor': ['axios', '@tanstack/react-query', 'dayjs'],
        },
        // 优化文件名
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // 启用 gzip 压缩报告
    reportCompressedSize: true,
    // 设置 chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    // 启用 sourcemap（生产环境可以关闭以减小文件大小）
    sourcemap: false,
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
