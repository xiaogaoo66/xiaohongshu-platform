# 阿里云前端 + Railway 后端配置指南

## 🎯 概述

如果你使用：
- **前端**：阿里云 OSS + CDN
- **后端**：Railway

**需要做的配置：**
1. ✅ **前端**：配置 API 地址指向 Railway 后端（构建时设置）
2. ✅ **后端**：配置 CORS 允许阿里云域名访问（Railway 环境变量）

**不需要改代码**，只需要配置！

---

## 📝 详细配置步骤

### 第一步：配置前端 API 地址（构建时设置）

由于阿里云 OSS 是静态文件托管，无法设置运行时的环境变量，需要在**构建时**设置。

#### 方式 1：修改构建脚本（推荐）

在 `frontend/package.json` 中修改构建脚本：

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:prod": "VITE_API_BASE_URL=https://你的railway域名.railway.app tsc && vite build"
  }
}
```

**构建命令：**
```bash
cd frontend
npm run build:prod
```

#### 方式 2：创建 `.env.production` 文件（推荐）

在 `frontend` 目录下创建 `.env.production` 文件：

```bash
# frontend/.env.production
VITE_API_BASE_URL=https://你的railway域名.railway.app
```

**注意：** 记得替换 `你的railway域名` 为实际的 Railway 后端域名。

**构建命令：**
```bash
cd frontend
npm run build
```

#### 方式 3：直接在命令行设置（临时）

```bash
cd frontend
VITE_API_BASE_URL=https://你的railway域名.railway.app npm run build
```

---

### 第二步：配置后端 CORS（Railway 环境变量）

在 Railway 控制台设置环境变量：

1. **登录 Railway 控制台**
   - 访问：https://railway.app
   - 登录你的账号

2. **进入项目设置**
   - 找到你的后端项目
   - 点击项目名称 → **"Variables"**（环境变量）

3. **添加环境变量**
   - 点击 **"New Variable"**（新建变量）
   - 添加以下环境变量：

   ```
   FRONTEND_URL=https://你的阿里云域名.com
   ```

   **注意：**
   - 替换 `你的阿里云域名` 为实际的阿里云域名
   - 如果使用 www 子域名，填写：`https://www.你的域名.com`
   - 如果使用根域名，填写：`https://你的域名.com`

4. **保存配置**
   - 点击 **"Save"**
   - Railway 会自动重新部署

---

## 🔧 配置示例

### 前端配置示例

**文件：`frontend/.env.production`**
```bash
# Railway 后端地址
VITE_API_BASE_URL=https://xiaohongshu-backend.railway.app
```

**或者修改 `frontend/package.json`：**
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:prod": "VITE_API_BASE_URL=https://xiaohongshu-backend.railway.app tsc && vite build"
  }
}
```

### 后端配置示例

**Railway 环境变量：**
```
FRONTEND_URL=https://www.xiaohongshu-content.com
```

**或者如果使用根域名：**
```
FRONTEND_URL=https://xiaohongshu-content.com
```

---

## 📋 配置检查清单

### 前端配置：
- [ ] 已创建 `.env.production` 文件（或修改构建脚本）
- [ ] `VITE_API_BASE_URL` 指向 Railway 后端地址
- [ ] 已重新构建前端代码
- [ ] 已上传构建后的文件到阿里云 OSS

### 后端配置：
- [ ] 已在 Railway 添加 `FRONTEND_URL` 环境变量
- [ ] `FRONTEND_URL` 指向阿里云域名（包含 https://）
- [ ] Railway 已重新部署

### 验证：
- [ ] 访问阿里云域名，网站可以正常打开
- [ ] 前端可以正常调用后端 API
- [ ] 管理员登录功能正常
- [ ] 用户领取功能正常

---

## 🔍 如何验证配置是否正确？

### 1. 检查前端 API 配置

1. **打开浏览器开发者工具**（F12）
2. **访问你的阿里云域名**
3. **打开 Network（网络）标签**
4. **查看 API 请求**：
   - 如果请求地址是 `https://你的railway域名.railway.app/api/xxx` → ✅ 正确
   - 如果请求地址是 `/api/xxx` → ❌ 配置错误，需要重新构建

### 2. 检查后端 CORS 配置

1. **打开浏览器开发者工具**（F12）
2. **访问你的阿里云域名**
3. **查看 Console（控制台）**：
   - 如果没有 CORS 错误 → ✅ 正确
   - 如果有 CORS 错误（例如：`Access-Control-Allow-Origin`）→ ❌ 配置错误

### 3. 测试功能

1. **管理员登录**：测试是否能正常登录
2. **查看内容列表**：测试是否能正常加载
3. **用户领取**：测试是否能正常领取内容

---

## ⚠️ 常见问题

### Q1: 前端调用 API 失败，显示 CORS 错误？

**原因：** Railway 后端没有配置 `FRONTEND_URL` 环境变量，或者配置错误。

**解决方案：**
1. 检查 Railway 环境变量 `FRONTEND_URL` 是否正确
2. 确保域名包含 `https://` 协议
3. 如果使用 www 子域名，确保配置了正确的域名
4. 保存后等待 Railway 重新部署（约2-3分钟）

---

### Q2: 前端调用 API 失败，显示 404 错误？

**原因：** 前端 API 地址配置错误。

**解决方案：**
1. 检查 `.env.production` 文件中的 `VITE_API_BASE_URL` 是否正确
2. 确保 Railway 后端地址正确（例如：`https://你的项目.railway.app`）
3. 确保地址以 `/api` 结尾（或前端代码会自动添加）
4. 重新构建前端代码：
   ```bash
   cd frontend
   npm run build
   ```
5. 重新上传到阿里云 OSS

---

### Q3: 前端调用 API 显示网络错误？

**原因：** Railway 后端可能没有运行，或者地址错误。

**解决方案：**
1. 访问 Railway 后端地址：`https://你的项目.railway.app/api/content/count`
2. 如果能正常访问 → 后端正常
3. 如果不能访问 → 检查 Railway 部署状态

---

### Q4: 如何同时支持多个域名？

**方式 1：修改后端代码（推荐）**

修改 `backend/src/main.ts`：

```typescript
// 启用 CORS
app.enableCors({
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',') // 支持多个域名，用逗号分隔
    : true,
  credentials: true,
});
```

然后在 Railway 环境变量中：
```
FRONTEND_URL=https://www.你的域名.com,https://你的域名.com
```

**方式 2：使用通配符（不推荐，安全性较低）**
```
FRONTEND_URL=https://*.你的域名.com
```

---

## 🔄 更新代码流程

### 更新前端代码：

1. **修改代码**
2. **设置 API 地址**（如果还没设置）：
   ```bash
   cd frontend
   VITE_API_BASE_URL=https://你的railway域名.railway.app npm run build
   ```
3. **上传到阿里云 OSS**

### 更新后端代码：

1. **修改代码**
2. **推送到 GitHub**：
   ```bash
   git add .
   git commit -m "更新内容"
   git push origin main
   ```
3. **Railway 自动部署**

---

## ✅ 总结

### 需要做的配置：

1. **前端（构建时）**：
   - ✅ 创建 `.env.production` 文件
   - ✅ 设置 `VITE_API_BASE_URL` 指向 Railway 后端
   - ✅ 重新构建和部署

2. **后端（Railway 环境变量）**：
   - ✅ 添加 `FRONTEND_URL` 环境变量
   - ✅ 设置为阿里云域名（包含 https://）
   - ✅ Railway 自动重新部署

### 不需要改代码：
- ✅ 前端代码不需要改（只需要环境变量）
- ✅ 后端代码不需要改（只需要环境变量）
- ✅ 只需要配置环境变量即可

---

**配置完成后，前端在阿里云，后端在 Railway，就可以正常工作了！** 🎉

---

**最后更新**：2025-11-03


