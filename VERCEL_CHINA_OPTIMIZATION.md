# Vercel 中国大陆访问速度优化指南

## 🔍 问题分析

### Vercel 在中国大陆访问慢的原因

1. **CDN 节点位置**
   - Vercel 的 CDN 节点主要在美国、欧洲、亚太（日本、新加坡）
   - 中国大陆没有 CDN 节点
   - 访问需要经过国际出口，延迟较高

2. **网络路由**
   - 可能经过多个网络节点
   - 国际带宽限制
   - 防火墙影响（部分情况下）

3. **DNS 解析**
   - Vercel 的 DNS 服务器在国外
   - 解析速度可能较慢

---

## 🚀 优化方案（按优先级排序）

### 方案 0：使用 Vercel 中国优化 CNAME（最简单⭐⭐⭐⭐）

**原理：** Vercel 提供了专门针对中国用户的 CNAME 记录，可以优化路由。

**步骤：**

1. **在 Cloudflare DNS 控制台修改 CNAME 记录**
   - 进入 Cloudflare → DNS → Records
   - 找到 `www.acgmbti.online` 的 CNAME 记录
   - 将目标值从 `cname.vercel-dns.com` 改为 `cname-china.vercel-dns.com`
   - 保存更改

2. **等待 DNS 生效**
   - 通常需要几分钟到几小时
   - 可以使用 `nslookup www.acgmbti.online` 检查是否生效

**优点：**
- ✅ 配置简单，只需修改一个 DNS 记录
- ✅ 无需额外成本
- ✅ 立即生效

**缺点：**
- ⚠️ 效果可能有限（取决于 Vercel 的优化程度）

**注意：** 这个方法可能不适用于所有 Vercel 项目，需要测试是否有效。

---

### 方案 1：使用国内 CDN 加速（推荐⭐⭐⭐⭐⭐）

**原理：** 将静态资源通过国内 CDN 加速，减少从 Vercel 加载的资源大小。

#### 1.1 使用七牛云 CDN（推荐）

**优点：**
- ✅ 免费额度：10GB 存储 + 10GB 流量/月
- ✅ 国内 CDN 节点多，速度快
- ✅ 配置简单
- ✅ 支持 HTTPS
- ✅ 不需要域名备案（使用七牛云提供的测试域名）

**配置步骤：**

1. **注册七牛云账号**
   - 访问：https://www.qiniu.com/
   - 注册并实名认证（免费）

2. **创建存储空间（Bucket）**
   - 登录七牛云控制台
   - 进入"对象存储" → "空间管理"
   - 点击"新建空间"
   - 配置：
     - 空间名称：`xiaohongshu-frontend`（自定义）
     - 存储区域：选择离用户最近（如：华东-浙江）
     - 访问控制：公开空间（前端需要公开访问）

3. **配置 CDN 加速**
   - 进入"CDN" → "域名管理"
   - 点击"添加域名"
   - 配置：
     - 加速域名：`cdn.acgmbti.online`（或使用七牛云提供的测试域名）
     - 源站类型：对象存储
     - 源站地址：选择刚创建的存储空间
     - 加速区域：仅中国内地
   - 等待审核（通常几分钟）

4. **上传静态资源到七牛云**
   - 在 Vite 构建配置中，将静态资源（JS/CSS/图片）上传到七牛云
   - HTML 文件仍然从 Vercel 加载

5. **修改 Vite 配置**

在 `frontend/vite.config.ts` 中添加：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.acgmbti.online/' // 七牛云 CDN 地址
    : '/',
  build: {
    rollupOptions: {
      output: {
        // 将静态资源上传到 CDN
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

**注意：** 这种方式需要手动上传静态资源到七牛云，或者使用构建脚本自动上传。

#### 1.2 使用又拍云 CDN（备选）

**优点：**
- ✅ 免费额度：10GB 存储 + 15GB 流量/月
- ✅ 国内 CDN 节点多
- ✅ 配置简单

**配置步骤：** 类似七牛云

---

### 方案 2：优化构建配置（立即生效⭐⭐⭐⭐）

**原理：** 通过代码分割、懒加载、压缩等方式，减少首次加载的资源大小。

#### 2.1 优化 Vite 构建配置

修改 `frontend/vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分割代码
        manualChunks: {
          // 将 React 相关库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将 Ant Design 单独打包
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
    // 启用 gzip 压缩
    reportCompressedSize: true,
    // 设置 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

#### 2.2 路由懒加载

修改路由配置，使用懒加载：

```typescript
// frontend/src/router/index.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// 懒加载组件
const Home = lazy(() => import('../pages/Home'))
const ContentList = lazy(() => import('../pages/ContentList'))
const ContentDetail = lazy(() => import('../pages/ContentDetail'))

function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>加载中...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/content" element={<ContentList />} />
          <Route path="/content/:id" element={<ContentDetail />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default Router
```

#### 2.3 图片优化

1. **使用 WebP 格式**
   - 在构建时自动转换为 WebP
   - 安装插件：`npm install vite-plugin-imagemin -D`

2. **图片懒加载**
   - 使用 `loading="lazy"` 属性
   - 或使用 `react-lazyload` 库

3. **使用 CDN 托管图片**
   - 将图片上传到七牛云或其他国内 CDN

---

### 方案 3：使用国内 DNS 服务（简单有效⭐⭐⭐）

**原理：** 使用国内 DNS 服务商，加快 DNS 解析速度。

#### 3.1 使用阿里云 DNS 或腾讯云 DNS

**步骤：**
1. 在 Cloudflare 控制台，将 DNS 记录改为"仅 DNS"（灰色云朵）
2. 在阿里云或腾讯云 DNS 控制台添加相同的 DNS 记录
3. 将域名的 NS 记录指向阿里云或腾讯云的 DNS 服务器

**优点：**
- ✅ DNS 解析速度更快
- ✅ 配置简单
- ✅ 免费

**缺点：**
- ⚠️ 需要管理两套 DNS 记录

---

### 方案 4：优化 HTML 和资源加载（立即生效⭐⭐⭐）

#### 4.1 添加资源预加载

在 `frontend/index.html` 中添加：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>小红书内容分发平台</title>
    
    <!-- DNS 预解析 -->
    <link rel="dns-prefetch" href="https://www.acgmbti.online" />
    <link rel="dns-prefetch" href="https://xiaohongshu-platform-production.up.railway.app" />
    
    <!-- 预连接 -->
    <link rel="preconnect" href="https://www.acgmbti.online" />
    <link rel="preconnect" href="https://xiaohongshu-platform-production.up.railway.app" />
    
    <!-- 预加载关键资源 -->
    <link rel="preload" href="/src/main.tsx" as="script" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### 4.2 添加 Service Worker（可选）

使用 Service Worker 缓存静态资源，减少重复请求。

---

### 方案 5：使用 Vercel 的 Edge Functions（高级⭐⭐）

**原理：** 使用 Vercel 的 Edge Functions，将部分逻辑移到边缘节点，减少延迟。

**适用场景：**
- API 代理
- 数据预处理
- 缓存策略

**配置步骤：**
1. 在 `frontend` 目录创建 `api` 目录
2. 创建 Edge Function 文件
3. 部署到 Vercel

**注意：** Edge Functions 在中国大陆的节点仍然有限，效果可能不明显。

---

### 方案 6：迁移到国内平台（终极方案⭐⭐⭐⭐⭐）

**如果优化后速度仍不满足需求，考虑迁移到国内平台：**

#### 6.1 阿里云 OSS + CDN

**优点：**
- ✅ 国内访问速度快
- ✅ 稳定可靠
- ✅ 不会被墙

**缺点：**
- ⚠️ 需要域名备案（约15-20天）
- ⚠️ 需要手动部署（或配置 CI/CD）

**详细指南：** 查看 `FRONTEND_DEPLOY_GUIDE.md`

#### 6.2 腾讯云 COS + CDN

类似阿里云，也是不错的选择。

---

## 🎯 推荐实施顺序

### 立即执行（无需额外成本）

1. ✅ **优化 Vite 构建配置**（方案 2.1）
   - 代码分割
   - 压缩优化
   - 预计提升：20-30%

2. ✅ **路由懒加载**（方案 2.2）
   - 减少首次加载资源
   - 预计提升：30-40%

3. ✅ **优化 HTML**（方案 4）
   - DNS 预解析
   - 资源预加载
   - 预计提升：10-15%

### 短期实施（需要注册账号，但免费）

4. ✅ **使用七牛云 CDN**（方案 1.1）
   - 静态资源加速
   - 预计提升：50-70%

5. ✅ **使用国内 DNS**（方案 3）
   - DNS 解析加速
   - 预计提升：10-20%

### 长期考虑（如果仍不满足需求）

6. ⚠️ **迁移到国内平台**（方案 6）
   - 最佳性能
   - 但需要备案

---

## 📊 预期效果

### 优化前
- 首次加载：3-5秒
- DNS 解析：300-600ms
- 资源加载：2-4秒

### 优化后（实施方案 1-4）
- 首次加载：1-2秒（提升 60-70%）
- DNS 解析：50-100ms（提升 80%）
- 资源加载：0.5-1秒（提升 75%）

---

## 🔧 实施步骤

### 步骤 1：优化构建配置（立即执行）

1. 修改 `frontend/vite.config.ts`（参考方案 2.1）
2. 修改路由配置，使用懒加载（参考方案 2.2）
3. 重新构建并部署

### 步骤 2：配置七牛云 CDN（推荐）

1. 注册七牛云账号
2. 创建存储空间
3. 配置 CDN 加速
4. 修改 Vite 配置，使用 CDN 地址
5. 上传静态资源到七牛云

### 步骤 3：优化 HTML

1. 修改 `frontend/index.html`（参考方案 4）
2. 重新构建并部署

---

## 📝 注意事项

### 1. 七牛云 CDN 配置注意事项

- ⚠️ 需要配置 HTTPS 证书（七牛云提供免费证书）
- ⚠️ 需要配置 CORS（允许 Vercel 域名访问）
- ⚠️ 需要定期更新静态资源（每次构建后）

### 2. 代码分割注意事项

- ⚠️ 不要过度分割，否则会增加 HTTP 请求数
- ⚠️ 合理设置 chunk 大小（建议 100-500KB）

### 3. 懒加载注意事项

- ⚠️ 关键页面不要懒加载（如首页）
- ⚠️ 提供合适的加载提示

---

## 🧪 测试方法

### 1. 使用浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 进入 Network 标签
3. 刷新页面
4. 查看：
   - DNS 解析时间
   - 资源加载时间
   - 总加载时间

### 2. 使用在线工具

- **WebPageTest**：https://www.webpagetest.org
- **GTmetrix**：https://gtmetrix.com
- **PageSpeed Insights**：https://pagespeed.web.dev

### 3. 使用诊断脚本

运行项目中的诊断脚本：

```bash
node scripts/diagnose-frontend-performance.js
```

---

## 🆘 常见问题

### Q1: 七牛云 CDN 需要备案吗？

**A:** 如果使用七牛云提供的测试域名（如 `xxx.qiniucdn.com`），不需要备案。如果使用自定义域名，需要备案。

### Q2: 优化后速度仍然很慢怎么办？

**A:** 
1. 检查是否所有优化都已实施
2. 测试不同网络环境（移动网络、不同运营商）
3. 考虑迁移到国内平台

### Q3: 使用 CDN 后，如何更新静态资源？

**A:** 
1. 每次构建后，上传新的静态资源到 CDN
2. 清除 CDN 缓存
3. 或配置自动上传脚本

### Q4: 代码分割后，HTTP 请求数增加，会影响速度吗？

**A:** 
- HTTP/2 支持多路复用，多个请求不会明显影响速度
- 代码分割的好处（减少首次加载大小）通常大于多请求的开销
- 建议合理分割，不要过度

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 浏览器 Network 标签的截图
2. 诊断脚本的输出结果
3. 具体的错误信息

---

**最后更新**：2024年

