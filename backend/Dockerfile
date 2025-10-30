############################################
# Builder stage - 安装所有依赖并编译 TypeScript
############################################
FROM node:18-alpine AS builder
WORKDIR /app

# 复制后端的包管理文件（构建上下文是 backend 目录）
COPY package*.json ./

# 安装全部依赖（包含 devDependencies 以便编译）
RUN npm ci

# 复制后端源码
COPY . .

# 生成 Prisma 客户端并编译 NestJS
RUN npx prisma generate && npm run build

############################################
# Runtime stage - 仅保留运行所需文件
############################################
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 仅拷贝运行所需的 node_modules（来自 builder）
COPY --from=builder /app/node_modules ./node_modules

# 拷贝编译产物与必要文件
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

# 暴露端口
EXPOSE 3000

# 运行前执行数据库迁移，然后启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
