# 测试和部署指南

## 📋 修改后的测试和部署流程

### 方式一：直接推送到 GitHub（推荐）

如果修改比较简单（比如只修改了 `package.json` 的依赖版本），可以直接推送到 GitHub，让 Railway 和 Vercel 自动部署。

#### 步骤 1：提交所有修改
```powershell
# 切换到项目目录
cd d:\xrsp\video-render-api

# 查看修改的文件
git status

# 添加所有修改的文件
git add .

# 提交修改（请修改提交信息）
git commit -m "fix: 锁定 tsconfig-paths 版本到 4.2.0"

# 推送到 GitHub
git push origin main
```

#### 步骤 2：等待自动部署
- **Railway（后端）**：推送后会自动触发构建和部署，查看 Railway 项目页面的 Deployments
- **Vercel（前端）**：推送后会自动触发构建和部署，查看 Vercel 项目页面的 Deployments

#### 步骤 3：验证部署结果
- 后端：访问 Railway 部署的 API 地址，测试接口是否正常
- 前端：访问 Vercel 部署的网站地址，测试功能是否正常

---

### 方式二：本地测试后再部署（推荐用于重要修改）

#### 步骤 1：本地测试后端

```powershell
# 进入后端目录
cd d:\xrsp\video-render-api\backend

# 安装依赖（确保使用新的 package.json）
npm install

# 检查是否有依赖错误
npm list tsconfig-paths

# 生成 Prisma 客户端
npx prisma generate

# 启动开发服务器
npm run start:dev
```

**测试要点：**
- ✅ 服务能否正常启动
- ✅ API 接口是否正常响应
- ✅ 没有依赖相关的错误

#### 步骤 2：本地测试前端（可选）

```powershell
# 进入前端目录
cd d:\xrsp\video-render-api\frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**测试要点：**
- ✅ 前端能否正常启动
- ✅ 能否正常访问后端 API
- ✅ 页面功能是否正常

#### 步骤 3：提交并推送

```powershell
# 返回项目根目录
cd d:\xrsp\video-render-api

# 添加修改
git add .

# 提交
git commit -m "fix: 锁定 tsconfig-paths 版本并测试通过"

# 推送
git push origin main
```

#### 步骤 4：监控部署

1. **Railway 部署监控**
   - 登录 Railway 项目页面
   - 点击 Deployments 标签
   - 查看最新的部署状态
   - 如果失败，查看日志排查问题

2. **Vercel 部署监控**
   - 登录 Vercel 项目页面
   - 查看 Deployments
   - 如果失败，查看构建日志

---

## 🔍 如何查看部署状态

### Railway（后端）
1. 打开 https://railway.app
2. 进入你的项目
3. 点击后端服务（Backend Service）
4. 查看 **Deployments** 标签
5. 点击最新的部署，查看日志

### Vercel（前端）
1. 打开 https://vercel.com
2. 进入你的项目
3. 查看 **Deployments** 列表
4. 点击最新的部署，查看构建日志

---

## ⚠️ 常见问题

### 问题 1：推送后 Railway 构建失败
**解决方法：**
- 查看 Railway 部署日志，找到错误原因
- 如果是依赖问题，检查 `package.json` 是否正确
- 如果是 Dockerfile 问题，检查 Dockerfile 路径和内容

### 问题 2：推送后 Vercel 构建失败
**解决方法：**
- 查看 Vercel 构建日志
- 检查前端代码是否有 TypeScript 错误
- 检查环境变量是否正确配置

### 问题 3：本地测试正常，部署后出问题
**解决方法：**
- 检查环境变量是否在 Railway/Vercel 中正确配置
- 检查数据库连接字符串是否正确
- 检查 API 地址是否正确

---

## 📝 快速检查清单

推送前检查：
- [ ] 本地测试通过（可选但推荐）
- [ ] 代码没有语法错误
- [ ] 修改的文件都已添加到 Git
- [ ] 提交信息清晰明了

推送后检查：
- [ ] Railway 构建成功
- [ ] Vercel 构建成功
- [ ] 后端 API 可以访问
- [ ] 前端页面可以正常打开
- [ ] 核心功能正常工作

