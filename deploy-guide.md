# 小红书内容分发平台 - 云端部署指南

## 🎯 部署目标
将本地项目部署到云端，让其他人可以通过互联网访问

## 📋 部署方案
- **前端**: Vercel (免费)
- **后端**: Railway (免费额度)
- **数据库**: Railway PostgreSQL

## 🚀 第一步：准备代码

### 1.1 创建 GitHub 仓库
1. 访问 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名：`xiaohongshu-platform`
4. 选择 "Public"
5. 点击 "Create repository"

### 1.2 上传代码到 GitHub
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/xiaohongshu-platform.git
git push -u origin main
```

## 🌐 第二步：部署前端到 Vercel

### 2.1 连接 Vercel
1. 访问 [Vercel](https://vercel.com)
2. 点击 "Sign up" 注册账号
3. 选择 "Continue with GitHub"
4. 授权 Vercel 访问您的 GitHub

### 2.2 部署前端
1. 在 Vercel 控制台点击 "New Project"
2. 选择 `xiaohongshu-platform` 仓库
3. 选择 `frontend` 文件夹作为根目录
4. 框架预设选择 "Vite"
5. 点击 "Deploy"

### 2.3 配置环境变量
在 Vercel 项目设置中添加：
```
VITE_API_BASE_URL=https://你的后端域名.railway.app
```

## ⚙️ 第三步：部署后端到 Railway

### 3.1 连接 Railway
1. 访问 [Railway](https://railway.app)
2. 点击 "Login" 注册账号
3. 选择 "Continue with GitHub"
4. 授权 Railway 访问您的 GitHub

### 3.2 创建数据库
1. 在 Railway 控制台点击 "New Project"
2. 选择 "Provision PostgreSQL"
3. 等待数据库创建完成
4. 记录数据库连接信息

### 3.3 部署后端
1. 在 Railway 控制台点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 `xiaohongshu-platform` 仓库
4. 选择 `backend` 文件夹
5. 点击 "Deploy"

### 3.4 配置环境变量
在 Railway 项目设置中添加：
```
DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=3000
```

## 🔧 第四步：修改代码适配云端

### 4.1 修改前端 API 配置
更新 `frontend/src/services/api.ts`：
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

### 4.2 修改后端数据库配置
更新 `backend/prisma/schema.prisma`：
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4.3 添加生产环境配置
创建 `backend/.env.production`：
```
DATABASE_URL=你的Railway数据库连接字符串
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=3000
```

## 📱 第五步：测试部署

### 5.1 测试前端
1. 访问 Vercel 提供的域名
2. 检查页面是否正常加载
3. 测试功能是否正常

### 5.2 测试后端
1. 访问 `https://你的后端域名.railway.app/api/content/count`
2. 检查是否返回数据

## 🎉 完成！

部署完成后，您将获得：
- 前端地址：`https://你的项目名.vercel.app`
- 后端地址：`https://你的项目名.railway.app`
- 数据库：Railway PostgreSQL

## 📞 分享给其他人

将前端地址分享给其他人，他们就可以通过互联网访问您的小红书内容分发平台了！

## 🔧 常见问题

### Q: 前端无法连接后端？
A: 检查 Vercel 环境变量 `VITE_API_BASE_URL` 是否正确

### Q: 后端数据库连接失败？
A: 检查 Railway 环境变量 `DATABASE_URL` 是否正确

### Q: 如何更新代码？
A: 推送代码到 GitHub，Vercel 和 Railway 会自动重新部署

## 💰 费用说明

- **Vercel**: 免费（有使用限制）
- **Railway**: 免费额度 $5/月
- **GitHub**: 免费（公开仓库）

对于个人项目，完全免费使用！
