# ⚡ 快速删除数据库内容 - 解决加载问题

## 🚨 问题：界面加载超时

如果 Railway 的 Data 标签页一直加载，说明数据量可能太大，界面无法正常显示。

---

## ✅ 解决方案 1：使用 Railway CLI（最推荐）

### 步骤：

1. **打开终端/命令行**（在项目目录下）

2. **检查是否已安装 Railway CLI**：
```bash
railway --version
```

3. **如果没有安装，先安装**：
```bash
npm i -g @railway/cli
```

4. **登录 Railway**：
```bash
railway login
```
   - 会在浏览器中打开登录页面，完成登录后返回终端

5. **进入项目目录并连接数据库**：
```bash
cd backend
railway connect
```
   - 这会打开 PostgreSQL 命令行界面

6. **执行删除命令**：
```sql
-- 先查看数据量
SELECT COUNT(*) FROM contents;

-- 删除所有内容数据
DELETE FROM contents;

-- 确认删除成功
SELECT COUNT(*) FROM contents;

-- 退出
\q
```

---

## ✅ 解决方案 2：使用 Prisma Studio（如果本地有 DATABASE_URL）

### 前提条件：
- 本地有 `.env` 文件，包含 `DATABASE_URL`
- 或者可以从 Railway 获取 `DATABASE_URL`

### 步骤：

1. **获取数据库连接字符串**：
   - 在 Railway 控制台，点击 Postgres 服务
   - 点击 "Credentials" 标签
   - 复制 `DATABASE_URL` 或连接信息

2. **在本地创建/更新 `.env` 文件**（在 `backend` 目录下）：
```env
DATABASE_URL="postgresql://postgres:密码@主机:5432/railway"
```

3. **运行 Prisma Studio**：
```bash
cd backend
npm run prisma:studio
```

4. **在浏览器中打开**（通常是 http://localhost:5555）

5. **删除数据**：
   - 点击 `Contents` 表
   - 选择所有记录
   - 点击删除按钮

---

## ✅ 解决方案 3：使用 psql 命令行工具

### 前提条件：
- 已安装 PostgreSQL 客户端（psql）
- 有数据库连接信息

### 步骤：

1. **获取连接信息**：
   - 在 Railway 控制台，点击 Postgres 服务
   - 点击 "Credentials" 标签
   - 复制连接信息

2. **连接数据库**：
```bash
psql "postgresql://postgres:密码@主机:5432/railway"
```

3. **执行删除命令**：
```sql
-- 查看数据
SELECT COUNT(*) FROM contents;

-- 删除所有内容
DELETE FROM contents;

-- 确认
SELECT COUNT(*) FROM contents;

-- 退出
\q
```

---

## 🎯 推荐操作流程（最简单）

**如果你在 Windows 上，推荐使用 Railway CLI：**

```bash
# 1. 安装 Railway CLI（如果还没安装）
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 进入项目目录
cd backend

# 4. 连接数据库
railway connect

# 5. 在打开的 PostgreSQL 命令行中执行：
DELETE FROM contents;

# 6. 退出
\q
```

---

## ⚠️ 注意事项

1. **不要删除 `_prisma_migrations` 表** - 这是 Prisma 的迁移记录
2. **谨慎删除 `admins` 表** - 删除后需要重新注册管理员
3. **只删除 `contents` 表的数据** - 这是你要清理的内容

---

## 🔍 如果 Railway CLI 连接失败

如果 `railway connect` 命令失败，可以：

1. **检查是否在正确的项目目录**：
```bash
railway status
```

2. **手动选择服务**：
```bash
railway service
# 选择 Postgres 服务
railway connect
```

3. **或者使用环境变量方式**：
```bash
# 获取 DATABASE_URL
railway variables

# 然后使用 psql 连接
psql $DATABASE_URL
```

---

## 📞 需要帮助？

如果以上方法都不行，告诉我：
1. 你使用的操作系统（Windows/Mac/Linux）
2. 是否已安装 Railway CLI
3. 是否已安装 PostgreSQL 客户端

我可以提供更具体的指导。

