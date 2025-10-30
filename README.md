# 小红书内容分发平台

一个全栈Web应用，用于小红书图文内容的上传、存储和随机分发系统。管理员上传内容，用户领取后内容自动删除，确保每组内容只被领取一次。

## 🚀 技术栈

### 后端
- **Node.js** + **NestJS** + **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **AWS S3** 文件存储
- **JWT** 认证
- **bcrypt** 密码加密

### 前端
- **React 18** + **TypeScript** + **Vite**
- **Ant Design** UI组件库
- **React Query** 状态管理
- **React Router** 路由管理

### 部署
- **Docker** + **Docker Compose**
- **Nginx** 反向代理

## 📋 功能特性

### 管理员功能
- ✅ 管理员登录/注册（JWT认证）
- ✅ 多图片上传（最多9张，支持AWS S3）
- ✅ 富文本文案编辑
- ✅ 内容管理（查看、删除）
- ✅ 统计信息展示
- ✅ 批量内容上传

### 用户功能
- ✅ 随机内容领取（无需登录）
- ✅ 图片预览和下载
- ✅ 文案一键复制
- ✅ 剩余内容数量显示
- ✅ 防刷机制（IP限流）

### 安全特性
- ✅ JWT Token认证
- ✅ 密码bcrypt加密
- ✅ 文件上传大小限制
- ✅ IP限流防刷
- ✅ 原子性领取操作

## 🛠️ 快速开始

### 环境要求
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+（如果本地运行）
- AWS S3 账户（用于文件存储）

### 1. 克隆项目
```bash
git clone <repository-url>
cd xiaohongshu-platform
```

### 2. 环境配置
复制环境变量文件并配置：
```bash
# 后端环境变量
cp backend/env.example backend/.env

# 编辑后端环境变量
nano backend/.env
```

配置以下环境变量：
```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/xiaohongshu_db?schema=public"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# AWS S3 配置
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-s3-bucket-name"

# 应用配置
PORT=3000
NODE_ENV="development"
```

### 3. 使用 Docker Compose 启动（推荐）

#### 生产环境
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 开发环境
```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 4. 本地开发

#### 后端开发
```bash
cd backend

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run start:dev
```

#### 前端开发
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📖 API 文档

启动服务后，访问 `http://localhost:3000/api/docs` 查看 Swagger API 文档。

### 主要接口

#### 管理员接口（需要JWT认证）
- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/register` - 管理员注册
- `POST /api/admin/content` - 创建内容
- `GET /api/admin/content` - 获取内容列表
- `DELETE /api/admin/content/:id` - 删除内容
- `GET /api/admin/stats` - 获取统计信息

#### 用户接口（无需认证）
- `GET /api/content/claim` - 随机领取内容
- `GET /api/content/count` - 获取剩余内容数量

#### 上传接口（需要JWT认证）
- `POST /api/upload/presigned-url` - 获取预签名上传URL

## 🎯 使用说明

### 管理员操作
1. 访问 `http://localhost/admin/login` 登录管理后台
2. 首次使用需要注册管理员账号
3. 在管理后台可以：
   - 上传多张图片和对应文案
   - 查看所有内容列表
   - 删除不需要的内容
   - 查看统计信息

### 用户操作
1. 访问 `http://localhost/` 进入领取页面
2. 点击"立即领取内容"按钮
3. 系统随机返回一组内容（图片+文案）
4. 可以预览、下载图片，复制文案
5. 领取后的内容会自动从系统中删除

## 🔧 配置说明

### 数据库配置
项目使用 PostgreSQL 数据库，通过 Prisma ORM 管理。数据库配置在 `backend/prisma/schema.prisma` 中。

### 文件存储配置
支持 AWS S3 存储，也可以配置其他兼容 S3 的存储服务（如阿里云OSS、腾讯云COS等）。

### 安全配置
- JWT密钥：建议使用强随机字符串
- 密码加密：使用bcrypt，强度为10
- 文件上传：单张图片限制5MB，最多9张
- 防刷机制：同一IP 10秒内只能领取一次

## 📁 项目结构

```
xiaohongshu-platform/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── content/        # 内容管理模块
│   │   ├── upload/         # 文件上传模块
│   │   ├── admin/          # 管理员模块
│   │   └── prisma/         # 数据库模块
│   ├── prisma/             # 数据库模式
│   └── Dockerfile          # 后端Docker配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   └── types/          # 类型定义
│   └── Dockerfile          # 前端Docker配置
├── docker-compose.yml      # 生产环境配置
├── docker-compose.dev.yml  # 开发环境配置
└── README.md              # 项目文档
```

## 🚀 部署指南

### 生产环境部署
1. 配置生产环境变量
2. 使用 `docker-compose up -d` 启动服务
3. 配置域名和SSL证书（可选）
4. 设置监控和日志收集

### 环境变量说明
- `DATABASE_URL`: PostgreSQL 连接字符串
- `JWT_SECRET`: JWT 签名密钥
- `AWS_ACCESS_KEY_ID`: AWS 访问密钥
- `AWS_SECRET_ACCESS_KEY`: AWS 秘密密钥
- `AWS_REGION`: AWS 区域
- `AWS_S3_BUCKET`: S3 存储桶名称

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至 [your-email@example.com]

---

⭐ 如果这个项目对你有帮助，请给它一个星标！