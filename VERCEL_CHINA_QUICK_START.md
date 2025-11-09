# Vercel 中国大陆优化 - 快速开始

## ✅ 已完成的优化

### 1. 优化 Vite 构建配置 ✅

**文件：** `frontend/vite.config.ts`

**优化内容：**
- ✅ 启用 Terser 压缩
- ✅ 移除 console 和 debugger
- ✅ 代码分割（React、Ant Design、其他库分别打包）
- ✅ 优化文件名（添加 hash）
- ✅ 关闭 sourcemap（减小文件大小）

**效果：** 预计减少 30-40% 的构建文件大小

### 2. 优化 HTML 资源加载 ✅

**文件：** `frontend/index.html`

**优化内容：**
- ✅ DNS 预解析（dns-prefetch）
- ✅ 预连接（preconnect）

**效果：** 预计减少 100-200ms 的 DNS 解析时间

---

## 🚀 下一步优化（按优先级）

### 优先级 0：使用 Vercel 中国优化 CNAME（最简单，立即尝试）

**预计提升：** 10-30% 访问速度

**步骤：**

1. **在 Cloudflare DNS 控制台修改 CNAME 记录**
   - 访问：https://dash.cloudflare.com/1624b6c78e7ef210a631eaa1a6559970/acgmbti.online/dns/records
   - 找到 `www.acgmbti.online` 的 CNAME 记录
   - 点击"编辑"
   - 将"内容"（Content）从 `cname.vercel-dns.com` 改为 `cname-china.vercel-dns.com`
   - 保存更改

2. **等待 DNS 生效（通常几分钟）**

3. **测试效果**
   - 运行诊断脚本：`node scripts/diagnose-frontend-performance.js`
   - 或使用浏览器开发者工具测试

**注意：** 如果当前 CNAME 记录不是指向 `cname.vercel-dns.com`，请检查 Vercel 控制台中的实际 CNAME 值。

---

### 优先级 1：路由懒加载（立即实施）

**预计提升：** 30-40% 首次加载速度

**步骤：**

1. 找到路由配置文件（通常在 `frontend/src/router/` 或 `frontend/src/App.tsx`）

2. 修改路由配置，使用懒加载：

```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// 懒加载组件
const Home = lazy(() => import('./pages/Home'))
const ContentList = lazy(() => import('./pages/ContentList'))
const ContentDetail = lazy(() => import('./pages/ContentDetail'))

function App() {
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

export default App
```

3. 重新构建并部署

---

### 优先级 2：使用七牛云 CDN（推荐，免费）

**预计提升：** 50-70% 静态资源加载速度

**步骤：**

1. **注册七牛云账号**
   - 访问：https://www.qiniu.com/
   - 注册并实名认证（免费）

2. **创建存储空间**
   - 登录控制台 → 对象存储 → 新建空间
   - 空间名称：`xiaohongshu-frontend`
   - 存储区域：华东-浙江（或离用户最近）
   - 访问控制：公开空间

3. **配置 CDN 加速**
   - 进入 CDN → 域名管理 → 添加域名
   - 加速域名：`cdn.acgmbti.online`（或使用七牛云测试域名）
   - 源站类型：对象存储
   - 源站地址：选择刚创建的存储空间
   - 加速区域：仅中国内地

4. **上传静态资源**
   - 构建项目：`npm run build`
   - 将 `dist/assets` 目录下的文件上传到七牛云
   - 或使用七牛云 CLI 工具自动上传

5. **修改 Vite 配置（可选）**
   - 如果使用自定义 CDN 域名，修改 `vite.config.ts` 中的 `base` 配置

**详细指南：** 查看 `VERCEL_CHINA_OPTIMIZATION.md` 方案 1.1

---

### 优先级 3：使用国内 DNS（简单有效）

**预计提升：** 10-20% DNS 解析速度

**步骤：**

1. **在阿里云或腾讯云 DNS 控制台添加记录**
   - 添加与 Cloudflare 相同的 DNS 记录
   - 确保记录值一致

2. **修改域名 NS 记录（可选）**
   - 如果完全使用国内 DNS，需要修改域名的 NS 记录
   - 或者保持 Cloudflare DNS，只使用国内 DNS 作为备用

**注意：** 如果使用 Cloudflare DNS，建议保持现状，因为 Cloudflare DNS 本身也很快。

---

## 📊 预期效果对比

### 优化前
- 首次加载：3-5秒
- DNS 解析：300-600ms
- 资源加载：2-4秒

### 优化后（完成优先级 1-2）
- 首次加载：1-2秒（提升 60-70%）
- DNS 解析：50-100ms（提升 80%）
- 资源加载：0.5-1秒（提升 75%）

---

## 🧪 测试优化效果

### 方法 1：使用浏览器开发者工具

1. 打开网站：https://www.acgmbti.online
2. 按 F12 打开开发者工具
3. 进入 Network 标签
4. 刷新页面（Ctrl+F5 强制刷新）
5. 查看：
   - **DNS Lookup**：DNS 解析时间
   - **Waiting (TTFB)**：服务器响应时间
   - **Content Download**：资源下载时间
   - **Load**：总加载时间

### 方法 2：使用诊断脚本

```bash
node scripts/diagnose-frontend-performance.js
```

### 方法 3：使用在线工具

- **WebPageTest**：https://www.webpagetest.org
- **GTmetrix**：https://gtmetrix.com
- **PageSpeed Insights**：https://pagespeed.web.dev

---

## 📝 实施检查清单

### 已完成 ✅
- [x] 优化 Vite 构建配置
- [x] 添加 DNS 预解析和预连接

### 待完成
- [ ] 实施路由懒加载
- [ ] 配置七牛云 CDN（可选，但强烈推荐）
- [ ] 测试优化效果
- [ ] 监控性能指标

---

## 🆘 常见问题

### Q1: 路由懒加载后，页面切换会变慢吗？

**A:** 不会。懒加载的页面会在首次访问时加载，之后会被缓存。页面切换时如果已经加载过，会立即显示。

### Q2: 七牛云 CDN 需要备案吗？

**A:** 如果使用七牛云提供的测试域名（如 `xxx.qiniucdn.com`），不需要备案。如果使用自定义域名（如 `cdn.acgmbti.online`），需要备案。

### Q3: 优化后速度仍然很慢怎么办？

**A:** 
1. 检查是否所有优化都已实施
2. 测试不同网络环境（移动网络、不同运营商）
3. 考虑迁移到国内平台（阿里云 OSS + CDN）

### Q4: 如何知道优化是否生效？

**A:** 
1. 对比优化前后的 Network 标签数据
2. 使用诊断脚本对比结果
3. 使用在线工具测试

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 浏览器 Network 标签的截图
2. 诊断脚本的输出结果
3. 具体的错误信息

**详细优化指南：** 查看 `VERCEL_CHINA_OPTIMIZATION.md`

---

**最后更新**：2024年

