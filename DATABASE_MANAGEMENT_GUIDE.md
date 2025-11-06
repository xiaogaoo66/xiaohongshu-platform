# 🗄️ Railway PostgreSQL 数据库管理指南

## 📋 确认：这是数据库

是的，你看到的 **"Postgres"** 服务就是 PostgreSQL 数据库服务。它用于存储：

1. **Admin 表**：管理员账户信息（用户名、密码）
2. **Content 表**：内容信息（图片URL、标题、文案、领取状态等）

---

## 🗑️ 如何删除数据库内的内容

### 方法 1：通过 Railway 数据库查询界面（推荐）

#### 步骤 1：打开数据库查询界面

1. 在 Railway 控制台，点击 **"Postgres"** 服务
2. 点击 **"Database"** 标签页
3. 你会看到一个 SQL 查询编辑器

#### 步骤 2：执行删除命令

**选项 A：删除所有内容（保留表结构）**

```sql
-- 删除所有内容记录
DELETE FROM contents;

-- 删除所有管理员（谨慎操作！）
DELETE FROM admins;
```

**选项 B：只删除已领取的内容**

```sql
-- 删除所有已领取的内容
DELETE FROM contents WHERE "isClaimed" = true;
```

**选项 C：删除所有数据并重置自增ID**

```sql
-- 清空所有表
TRUNCATE TABLE contents, admins CASCADE;
```

**选项 D：删除特定时间之前的内容**

```sql
-- 删除 7 天前的内容
DELETE FROM contents WHERE "createdAt" < NOW() - INTERVAL '7 days';
```

#### 步骤 3：确认删除

执行后，查询界面会显示删除的行数。

---

### 方法 2：通过 Railway CLI 连接数据库

#### 步骤 1：安装 Railway CLI

```bash
npm i -g @railway/cli
```

#### 步骤 2：登录 Railway

```bash
railway login
```

#### 步骤 3：连接到数据库

```bash
railway connect
```

这会打开一个 PostgreSQL 命令行界面。

#### 步骤 4：执行 SQL 命令

```sql
-- 查看当前数据
SELECT COUNT(*) FROM contents;
SELECT COUNT(*) FROM admins;

-- 删除数据
DELETE FROM contents;
DELETE FROM admins;

-- 退出
\q
```

---

### 方法 3：使用外部数据库客户端

#### 步骤 1：获取数据库连接信息

1. 在 Railway 控制台，点击 **"Postgres"** 服务
2. 点击 **"Variables"** 标签页
3. 找到 **`DATABASE_URL`** 或 **`PGDATABASE`**、**`PGHOST`**、**`PGPORT`**、**`PGUSER`**、**`PGPASSWORD`** 等变量
4. 复制连接信息

#### 步骤 2：使用数据库客户端连接

可以使用以下工具：
- **pgAdmin**（图形界面）
- **DBeaver**（图形界面）
- **TablePlus**（Mac/Windows）
- **psql**（命令行）

#### 步骤 3：执行删除操作

连接后，执行上述 SQL 命令即可。

---

## ⚠️ 关于 S3 和数据库的关系

### ❌ 重要澄清：S3 不是数据库

**S3（Amazon Simple Storage Service）是对象存储服务，不是数据库。**

### ✅ 它们需要配合使用

在你的项目中：

1. **PostgreSQL 数据库** 存储：
   - 内容元数据（标题、文案、创建时间等）
   - 图片的 **URL 地址**（指向 S3）
   - 管理员账户信息
   - 领取状态等结构化数据

2. **AWS S3** 存储：
   - 实际的图片文件
   - 视频文件（如果有）
   - 其他二进制文件

### 🔗 它们的关系

```
用户上传图片
    ↓
图片上传到 S3 → 获得 S3 URL
    ↓
S3 URL + 文案 → 保存到 PostgreSQL 数据库
    ↓
用户领取内容 → 从数据库读取 S3 URL → 显示图片
```

### ❌ 不要断联数据库

**即使你配置了 S3，也绝对不能断联 PostgreSQL 数据库！**

原因：
- ✅ S3 只存储文件，不存储结构化数据
- ✅ 数据库存储内容元数据、管理员信息、领取状态等
- ✅ 应用需要数据库来查询、管理内容
- ✅ 没有数据库，应用无法运行

---

## 🎯 推荐配置

### 正确的架构

```
┌─────────────────┐
│   前端应用      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   后端 API      │
└─────┬───────┬───┘
      │       │
      ↓       ↓
┌─────────┐ ┌──────────┐
│PostgreSQL│ │  AWS S3  │
│ 数据库   │ │ 文件存储 │
└─────────┘ └──────────┘
```

### 环境变量配置

在 Railway 后端服务中，需要同时配置：

```env
# 数据库连接（必需）
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway

# S3 配置（必需）
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# 其他配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=3000
```

---

## 🔧 常见操作场景

### 场景 1：清理旧数据释放空间

```sql
-- 查看数据库大小
SELECT 
    pg_size_pretty(pg_database_size('railway')) AS database_size;

-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 删除已领取的内容
DELETE FROM contents WHERE "isClaimed" = true;
```

### 场景 2：重置所有数据（重新开始）

```sql
-- 清空所有表
TRUNCATE TABLE contents, admins CASCADE;

-- 注意：清空后需要重新创建管理员账户
```

### 场景 3：备份数据

在删除前，建议先备份：

```sql
-- 导出数据（在 Railway CLI 中）
pg_dump $DATABASE_URL > backup.sql

-- 或者使用 Railway 的备份功能
-- 在 Postgres 服务 → "Backups" 标签页
```

---

## ⚠️ 注意事项

1. **删除前备份**：重要数据删除前建议先备份
2. **管理员账户**：删除 `admins` 表后，需要重新注册管理员
3. **S3 文件**：删除数据库记录不会自动删除 S3 中的文件
4. **磁盘空间**：如果数据库空间不足，删除旧数据可以释放空间

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Railway 日志：Postgres 服务 → "Logs" 标签
2. 检查数据库连接：后端服务 → "Logs" 标签
3. 查看 Railway 文档：https://docs.railway.app/databases/postgresql

