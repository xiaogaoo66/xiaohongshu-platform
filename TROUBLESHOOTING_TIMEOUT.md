# 🔧 请求超时问题排查指南

## 📋 问题描述

后台登录显示"请求超时，请检查网络连接"，前几天都正常工作，今天突然不行了。

---

## 🎯 可能的原因

基于你的部署架构：
- **前端**：部署在 Vercel (`xiaohongshu-platform.vercel.app`)
- **后端**：部署在 Railway (`xiaohongshu-platform-production.up.railway.app`)

**可能的原因：**

1. ⚠️ **数据库磁盘空间已满**（根据日志确认 - 最可能的原因）
   - PostgreSQL 数据库磁盘空间不足
   - Base64 编码的图片占用大量空间
   - 错误信息：`No space left on device`
   - **查看详细修复指南**：`DATABASE_DISK_SPACE_FIX.md`

2. ✅ **Railway 后端服务暂停或停止**
   - Railway 免费额度用完
   - 服务因错误而停止
   - 域名变更

3. ✅ **Vercel 环境变量丢失或未设置**
   - `VITE_API_BASE_URL` 环境变量未正确配置
   - 环境变量被删除或修改

4. ✅ **网络连接问题**
   - Railway 服务暂时不可用
   - DNS 解析问题

---

## 🔍 第一步：检查 Railway 后端服务状态

### 1.1 登录 Railway 控制台

1. 访问：https://railway.app
2. 登录你的账号
3. 找到你的后端项目（`xiaohongshu-platform-production`）

### 1.2 检查服务状态

1. **查看服务是否运行**
   - 在项目页面，查看服务状态
   - 如果显示 **"Stopped"** 或 **"Paused"** → 需要启动服务
   - 如果显示 **"Deploying"** → 等待部署完成
   - 如果显示 **"Active"** → 服务正常运行

2. **检查部署历史**
   - 点击 **"Deployments"** 标签
   - 查看最新的部署状态
   - 如果有失败的部署，查看错误日志

3. **检查服务域名**
   - 点击服务 → **"Settings"** → **"Networking"**
   - 查看 **"Public Domain"** 或 **"Custom Domain"**
   - 确认域名是：`xiaohongshu-platform-production.up.railway.app`

### 1.3 测试后端 API 是否可访问

在浏览器中直接访问：

```
https://xiaohongshu-platform-production.up.railway.app/api/content/count
```

**结果判断：**
- ✅ 如果能正常返回数据（JSON 格式）→ 后端正常
- ❌ 如果显示 "无法访问此网站" 或超时 → 后端服务不可用

---

## 🔍 第二步：检查 Vercel 环境变量

### 2.1 登录 Vercel 控制台

1. 访问：https://vercel.com
2. 登录你的账号
3. 找到你的前端项目（`xiaohongshu-platform`）

### 2.2 检查环境变量

1. **进入项目设置**
   - 点击项目名称 → **"Settings"**（设置）
   - 在左侧菜单中，点击 **"Environment Variables"**（环境变量）

2. **检查 `VITE_API_BASE_URL`**
   - 查找 `VITE_API_BASE_URL` 环境变量
   - 确认值应该是：`https://xiaohongshu-platform-production.up.railway.app/api`
   - 或者：`https://xiaohongshu-platform-production.up.railway.app`

3. **如果环境变量不存在或错误**
   - 点击 **"Add"** 或 **"Edit"**
   - 添加/修改：
     ```
     Key: VITE_API_BASE_URL
     Value: https://xiaohongshu-platform-production.up.railway.app/api
     ```
   - 环境选择：**Production**（生产环境）
   - 点击 **"Save"**

4. **重新部署**
   - 环境变量修改后，需要重新部署
   - 点击 **"Deployments"** 标签
   - 点击最新的部署右侧的 **"..."** → **"Redeploy"**

---

## 🔍 第三步：检查浏览器控制台

### 3.1 打开开发者工具

1. 访问前端页面：`https://xiaohongshu-platform.vercel.app/admin/login`
2. 按 **F12** 打开开发者工具
3. 切换到 **"Console"**（控制台）标签
4. 切换到 **"Network"**（网络）标签

### 3.2 查看 API 请求

1. **尝试登录**
   - 输入用户名和密码
   - 点击登录按钮

2. **查看 Network 标签**
   - 找到登录请求（通常是 `POST /admin/login`）
   - 查看请求的 **URL**：
     - ✅ 如果 URL 是：`https://xiaohongshu-platform-production.up.railway.app/api/admin/login` → 配置正确
     - ❌ 如果 URL 是：`/api/admin/login` → 环境变量未设置，前端使用了相对路径

3. **查看请求状态**
   - 如果请求显示 **"Failed"** 或 **"Timeout"** → 后端不可访问
   - 如果请求显示 **"CORS error"** → CORS 配置问题

---

## 🔧 解决方案

### 方案 1：Railway 服务已停止（最常见）

**症状：**
- Railway 控制台显示服务状态为 "Stopped" 或 "Paused"
- 直接访问后端 URL 无法打开

**解决方法：**

1. **重新启动服务**
   - 在 Railway 控制台，找到你的后端服务
   - 点击服务 → 点击 **"Restart"** 或 **"Deploy"** 按钮
   - 等待服务重新部署（约 2-5 分钟）

2. **检查免费额度**
   - Railway 每月有 $5 免费额度
   - 如果额度用完，需要升级或等待下个计费周期
   - 查看 Railway 控制台 → **"Usage"** 标签

3. **检查部署日志**
   - 如果服务无法启动，查看 **"Deployments"** → 最新部署 → **"View Logs"**
   - 根据错误信息修复问题

### 方案 2：Vercel 环境变量未设置

**症状：**
- 浏览器 Network 标签显示请求 URL 是 `/api/admin/login`（相对路径）
- Vercel 环境变量中没有 `VITE_API_BASE_URL`

**解决方法：**

1. **在 Vercel 中添加环境变量**
   ```
   Key: VITE_API_BASE_URL
   Value: https://xiaohongshu-platform-production.up.railway.app/api
   ```
   - 环境选择：**Production**
   - 点击 **"Save"**

2. **重新部署前端**
   - 在 Vercel 控制台 → **"Deployments"**
   - 点击最新部署右侧的 **"..."** → **"Redeploy"**
   - 等待部署完成（约 1-2 分钟）

3. **清除浏览器缓存**
   - 按 **Ctrl + Shift + Delete**（Windows）或 **Cmd + Shift + Delete**（Mac）
   - 清除缓存后，重新访问页面

### 方案 3：Railway 域名变更

**症状：**
- Railway 控制台显示的域名与配置不一致
- 直接访问配置的域名无法打开

**解决方法：**

1. **获取新的 Railway 域名**
   - 在 Railway 控制台 → 服务 → **"Settings"** → **"Networking"**
   - 复制新的公共域名

2. **更新 Vercel 环境变量**
   - 在 Vercel 控制台 → **"Settings"** → **"Environment Variables"**
   - 修改 `VITE_API_BASE_URL` 为新的域名
   - 格式：`https://新域名.railway.app/api`

3. **重新部署前端**
   - 在 Vercel 控制台 → **"Deployments"** → **"Redeploy"**

### 方案 4：后端代码错误导致服务崩溃

**症状：**
- Railway 部署失败
- 部署日志显示错误信息

**解决方法：**

1. **查看部署日志**
   - Railway 控制台 → **"Deployments"** → 最新部署 → **"View Logs"**
   - 查看错误信息

2. **常见错误及解决：**
   - **数据库连接失败**：检查 `DATABASE_URL` 环境变量
   - **依赖安装失败**：检查 `package.json` 是否正确
   - **构建错误**：检查代码是否有语法错误

3. **修复后重新部署**
   - 修复代码或配置
   - Railway 会自动重新部署（如果连接了 GitHub）

---

## ✅ 快速检查清单

按顺序检查以下项目：

### Railway（后端）
- [ ] 服务状态是 "Active"（运行中）
- [ ] 最新部署状态是 "Success"（成功）
- [ ] 可以直接访问：`https://xiaohongshu-platform-production.up.railway.app/api/content/count`
- [ ] 免费额度未用完（查看 Usage）

### Vercel（前端）
- [ ] 环境变量 `VITE_API_BASE_URL` 已设置
- [ ] 环境变量值为：`https://xiaohongshu-platform-production.up.railway.app/api`
- [ ] 最新部署状态是 "Ready"（就绪）
- [ ] 浏览器 Network 标签显示请求 URL 是完整域名（不是相对路径）

### 浏览器
- [ ] 清除缓存后重新访问
- [ ] 开发者工具 Console 没有红色错误
- [ ] Network 标签显示请求可以发送到后端

---

## 🚨 紧急修复步骤（如果以上都不行）

如果以上方法都不行，可以尝试以下紧急修复：

### 临时方案：使用本地后端

1. **本地启动后端**
   ```bash
   cd backend
   npm install
   npx prisma migrate deploy
   npm run start:prod
   ```

2. **使用 ngrok 等工具暴露本地服务**
   ```bash
   # 安装 ngrok（如果还没有）
   # 下载：https://ngrok.com/download
   
   # 启动隧道
   ngrok http 3000
   ```

3. **更新 Vercel 环境变量**
   ```
   VITE_API_BASE_URL=https://你的ngrok域名.ngrok.io/api
   ```

4. **重新部署前端**

---

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供以下信息：

1. **Railway 服务状态截图**
2. **Vercel 环境变量截图**
3. **浏览器 Network 标签截图**（显示请求 URL 和错误信息）
4. **浏览器 Console 标签截图**（显示错误信息）

---

## 🔄 预防措施

为了避免将来再次出现这个问题：

1. **定期检查 Railway 服务状态**
   - 每周检查一次服务是否正常运行
   - 监控免费额度使用情况

2. **设置 Railway 监控**
   - 在 Railway 控制台设置监控告警
   - 服务停止时自动通知

3. **备份环境变量**
   - 记录所有环境变量的值
   - 保存在安全的地方

4. **使用自定义域名**
   - Railway 的默认域名可能会变化
   - 使用自定义域名更稳定

---

**最后更新**：2025-01-27

