import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 使用默认压缩（esbuild，更稳定）
    minify: 'esbuild',
    // 代码分割优化（将所有 vendor 库放在一个 chunk，避免依赖顺序问题）
    rollupOptions: {
      output: {
        // 手动分割代码，将所有第三方库放在一个 chunk
        manualChunks: (id) => {
          // 将所有 node_modules 中的包放在一个 vendor chunk
          if (id.includes('node_modules')) {
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
