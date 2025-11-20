# 🚀 部署到 Railway 完整流程

## 📋 前置检查

### 1. 确认环境变量已迁移
确保本地 `.env` 文件已包含 `OSS_*` 环境变量（已通过迁移脚本完成）

### 2. 检查 Railway 环境变量
在 Railway 控制台需要配置以下环境变量：
- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`
- `OSS_REGION`
- `OSS_BUCKET`
- `OSS_ENDPOINT`
- `OSS_PUBLIC_BASE_URL` (可选)

## 🔄 部署步骤

### 步骤 1: 提交代码更改

```bash
# 查看更改
git status

# 添加所有更改（不包括 .env 和备份文件）
git add backend/src/
git add backend/package.json
git add backend/package-lock.json
git add backend/env.example
git add scripts/
git add docs/
git add frontend/

# 提交更改
git commit -m "feat: 迁移到阿里云 OSS，添加 OSS_* 环境变量支持"
```

### 步骤 2: 推送到 GitHub

```bash
# 推送到远程仓库
git push origin main
```

### 步骤 3: Railway 自动部署

推送代码后，Railway 会自动：
1. 检测到新的提交
2. 拉取最新代码
3. 安装依赖
4. 构建项目
5. 重启服务

**部署时间**：通常 2-5 分钟

### 步骤 4: 检查部署状态

1. 访问 [Railway Dashboard](https://railway.app)
2. 选择你的项目
3. 查看 "Deployments" 标签页
4. 确认最新部署状态为 "Success"

### 步骤 5: 验证服务

```bash
# 检查后端健康状态
curl https://你的railway域名.railway.app/health

# 或检查 API 端点
curl https://你的railway域名.railway.app/api/health
```

## ⚠️ 重要提示

### 环境变量配置

**必须在 Railway 控制台手动添加 `OSS_*` 环境变量**：

1. 登录 Railway Dashboard
2. 选择你的后端服务
3. 进入 "Variables" 标签页
4. 添加以下变量：
   ```
   OSS_ACCESS_KEY_ID=你的AccessKeyId
   OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
   OSS_REGION=oss-cn-chengdu
   OSS_BUCKET=xhs-content
   OSS_ENDPOINT=https://oss-cn-chengdu.aliyuncs.com
   ```

5. 添加后，Railway 会自动重新部署

### 手动重启（如果需要）

如果自动部署失败，可以手动重启：

1. 在 Railway Dashboard 中
2. 选择你的服务
3. 点击 "Deployments"
4. 点击 "Redeploy" 按钮

## 🔍 故障排查

### 部署失败

1. **检查构建日志**：
   - 在 Railway Dashboard 中查看 "Deployments" → "View Logs"
   - 查找错误信息

2. **常见问题**：
   - 依赖安装失败 → 检查 `package.json`
   - 构建错误 → 检查 TypeScript 编译错误
   - 环境变量缺失 → 检查 Railway 环境变量配置

### 服务无法访问

1. **检查服务状态**：确保服务状态为 "Running"
2. **检查端口配置**：确保 `PORT` 环境变量正确
3. **检查域名**：确保 Railway 已分配公共域名

## 📝 快速命令

```bash
# 一键提交并推送（不包括敏感文件）
git add backend/src/ backend/package*.json backend/env.example scripts/ docs/ frontend/
git commit -m "feat: 迁移到阿里云 OSS"
git push origin main
```


