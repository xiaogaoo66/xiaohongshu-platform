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
        pure_funcs: ['console.log', 'console.info'], // 移除特定函数调用
      },
    },
    // 代码分割优化
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
        // 优化文件名，使用更短的 hash
        assetFileNames: 'assets/[name]-[hash:8][extname]',
        chunkFileNames: 'assets/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
      },
    },
    // 启用 gzip 压缩报告
    reportCompressedSize: true,
    // 设置 chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    // 启用 sourcemap（生产环境可以关闭以减小文件大小）
    sourcemap: false,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 优化构建目标
    target: 'es2015',
    // 启用压缩
    cssMinify: true,
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
