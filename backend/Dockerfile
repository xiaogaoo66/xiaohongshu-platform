# ---------- Builder ----------
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# 构建期依赖（Prisma 在 Debian 更稳）
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 利用缓存：先拷贝包文件，再安装依赖（仓库无 lock，用 npm install）
COPY package*.json ./
RUN npm install

# 拷贝源码并生成 Prisma 客户端 + 编译 Nest
COPY . .
RUN npx prisma generate && npm run build

# ---------- Runtime ----------
FROM node:18-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 仅复制运行所需
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

EXPOSE 3000
CMD ["sh","-c","npx prisma db push --accept-data-loss || echo 'Prisma push failed, continuing...'; node dist/main.js"]
