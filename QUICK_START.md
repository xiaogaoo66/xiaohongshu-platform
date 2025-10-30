# 🚀 快速启动指南

## 环境准备

### 1. 安装必要软件
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 2. 配置 AWS S3（必需）
1. 登录 [AWS 控制台](https://aws.amazon.com/)
2. 创建 S3 存储桶
3. 创建 IAM 用户并获取访问密钥
4. 记录以下信息：
   - Access Key ID
   - Secret Access Key
   - Region（如：us-east-1）
   - Bucket Name

## 快速启动

### 1. 克隆项目
```bash
git clone <repository-url>
cd xiaohongshu-platform
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp backend/env.example backend/.env

# 编辑环境变量（Windows 用户可以用记事本）
nano backend/.env
```

在 `backend/.env` 文件中配置：
```env
# 数据库配置（Docker 会自动创建）
DATABASE_URL="postgresql://postgres:postgres123@postgres:5432/xiaohongshu_db?schema=public"

# JWT 配置（可以保持默认）
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# AWS S3 配置（必须配置）
AWS_ACCESS_KEY_ID="你的AWS访问密钥"
AWS_SECRET_ACCESS_KEY="你的AWS秘密密钥"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="你的S3存储桶名称"

# 应用配置
PORT=3000
NODE_ENV="development"
```

### 3. 启动服务

#### 方式一：使用脚本（推荐）
```bash
# Windows PowerShell
.\scripts\start-dev.sh

# Linux/Mac
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

#### 方式二：手动启动
```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动后，运行数据库迁移
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
```

### 4. 访问应用

- **前端应用**: http://localhost:5173
- **管理后台**: http://localhost:5173/admin/login
- **API 文档**: http://localhost:3000/api/docs

## 首次使用

### 1. 注册管理员账号
1. 访问 http://localhost:5173/admin/login
2. 点击"立即注册"
3. 输入用户名和密码（至少6位）
4. 注册成功后自动登录

### 2. 上传内容
1. 在管理后台点击"上传新内容"
2. 上传图片（最多9张，单张不超过5MB）
3. 输入文案内容
4. 点击"创建内容"

### 3. 测试领取功能
1. 访问 http://localhost:5173
2. 点击"立即领取内容"
3. 查看返回的图片和文案
4. 测试下载和复制功能

## 常见问题

### Q: 启动失败怎么办？
A: 检查以下几点：
1. Docker 是否正常运行
2. 端口 3000 和 5173 是否被占用
3. AWS S3 配置是否正确
4. 查看日志：`docker-compose -f docker-compose.dev.yml logs -f`

### Q: 图片上传失败？
A: 检查 AWS S3 配置：
1. Access Key 和 Secret Key 是否正确
2. S3 存储桶是否存在
3. IAM 用户是否有 S3 权限

### Q: 数据库连接失败？
A: 确保 PostgreSQL 容器正常运行：
```bash
docker-compose -f docker-compose.dev.yml ps
```

### Q: 如何停止服务？
```bash
# 停止开发环境
docker-compose -f docker-compose.dev.yml down

# 停止生产环境
docker-compose down
```

## 生产环境部署

### 1. 配置生产环境变量
```bash
# 编辑生产环境配置
nano backend/.env
```

### 2. 启动生产环境
```bash
# 使用脚本
.\scripts\start-prod.sh

# 或手动启动
docker-compose up -d
```

### 3. 配置域名（可选）
修改 `frontend/nginx.conf` 中的 `server_name` 配置。

## 开发说明

### 后端开发
- 代码位置：`backend/src/`
- 数据库模型：`backend/prisma/schema.prisma`
- API 文档：http://localhost:3000/api/docs

### 前端开发
- 代码位置：`frontend/src/`
- 页面组件：`frontend/src/pages/`
- API 服务：`frontend/src/services/`

### 数据库管理
```bash
# 查看数据库
docker-compose -f docker-compose.dev.yml exec backend npx prisma studio

# 重置数据库
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate reset
```

## 技术支持

如遇到问题，请：
1. 查看项目 README.md
2. 检查 Docker 日志
3. 提交 Issue 或联系开发者

---

🎉 恭喜！您已成功启动小红书内容分发平台！
