# 前端更新部署指南 - 添加 AWS 配置测试功能

## 📋 更新内容

已添加"测试 AWS 配置"功能：
- ✅ 在管理后台侧边栏添加了"测试 AWS 配置"按钮
- ✅ 添加了配置诊断模态框
- ✅ 添加了后端测试接口 `/api/upload/test-config`

## 🚀 部署步骤

### 方式一：如果前端部署在 Vercel（推荐）

Vercel 会自动检测 GitHub 推送并自动部署。

#### 步骤 1：提交并推送代码

```powershell
# 在项目根目录执行
cd d:\xrsp\video-render-api

# 查看修改的文件
git status

# 添加修改的文件
git add frontend/src/pages/AdminDashboard.tsx
git add frontend/src/services/api.ts
git add backend/src/upload/upload.controller.ts
git add backend/src/upload/upload.service.ts

# 提交修改
git commit -m "feat: 添加 AWS S3 配置测试功能"

# 推送到 GitHub
git push origin main
```

#### 步骤 2：等待自动部署

1. **Vercel 自动部署**：
   - 推送后，Vercel 会自动检测到代码变更
   - 自动触发构建和部署
   - 通常需要 1-3 分钟

2. **Railway 自动部署**（后端）：
   - 推送后，Railway 也会自动检测到代码变更
   - 自动触发构建和部署
   - 通常需要 2-5 分钟

#### 步骤 3：验证部署

1. 访问前端网站（Vercel 域名）
2. 登录管理后台
3. 在左侧侧边栏的"快速操作"卡片中，应该能看到"测试 AWS 配置"按钮

---

### 方式二：如果前端部署在阿里云 OSS

需要手动构建和上传。

#### 步骤 1：本地构建前端

```powershell
# 进入前端目录
cd d:\xrsp\video-render-api\frontend

# 安装依赖（如果需要）
npm install

# 构建生产版本
npm run build
```

构建完成后，会在 `frontend/dist` 目录生成静态文件。

#### 步骤 2：上传到阿里云 OSS

1. 登录阿里云 OSS 控制台
2. 进入你的存储桶
3. 删除旧文件（或直接覆盖）
4. 上传 `frontend/dist` 目录下的所有文件

#### 步骤 3：清除 CDN 缓存（如果使用了 CDN）

1. 登录阿里云 CDN 控制台
2. 找到对应的加速域名
3. 点击"刷新缓存"
4. 选择"目录刷新"，输入 `/`

#### 步骤 4：验证部署

1. 访问前端网站（CDN 域名或 OSS 域名）
2. 登录管理后台
3. 在左侧侧边栏的"快速操作"卡片中，应该能看到"测试 AWS 配置"按钮

---

## 🔍 如何确认前端部署方式

### 检查 Vercel

1. 访问 https://vercel.com
2. 登录你的账号
3. 查看是否有这个项目

### 检查阿里云 OSS

1. 访问 https://oss.console.aliyun.com
2. 登录你的账号
3. 查看是否有存储桶

---

## ⚠️ 注意事项

1. **后端也需要部署**：确保后端代码也推送到 GitHub，Railway 会自动部署
2. **清除浏览器缓存**：如果看不到按钮，尝试清除浏览器缓存或使用无痕模式
3. **检查控制台**：打开浏览器开发者工具，查看是否有 JavaScript 错误

---

## 🐛 如果看不到按钮

1. **检查代码是否推送**：
   ```powershell
   git log --oneline -5
   ```
   确认最新的提交包含你的修改

2. **检查部署状态**：
   - Vercel：查看 Vercel 控制台的 Deployments 页面
   - Railway：查看 Railway 控制台的 Deployments 页面

3. **强制刷新**：
   - 按 `Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）强制刷新页面

4. **检查浏览器控制台**：
   - 按 `F12` 打开开发者工具
   - 查看 Console 标签页是否有错误

