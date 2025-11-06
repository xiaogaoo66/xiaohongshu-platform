# 🚨 数据库磁盘空间不足 - 紧急修复指南

## 📋 问题诊断

根据 Railway 日志，你的 PostgreSQL 数据库磁盘空间已满：

```
Error: could not extend file "base/16384/16411": No space left on device
hint: Check free disk space.
```

这导致：
- ✅ 应用可以正常启动
- ❌ 无法创建新内容（数据库写入失败）
- ❌ 服务频繁重启（资源限制）

---

## 🔍 问题原因

### 主要原因：Base64 图片存储在数据库中

从日志可以看到：
```
警告: AWS S3 环境变量未配置，图片上传功能将使用 Base64 编码（临时方案）
```

**Base64 编码的图片会占用大量数据库空间：**
- 一张 1MB 的图片 → Base64 编码后约 1.33MB
- 100 张图片 → 约 133MB
- 1000 张图片 → 约 1.3GB

Railway 免费 PostgreSQL 数据库通常只有 **1GB** 存储空间，很容易被填满。

---

## 🚀 立即解决方案

### 方案 1：清理数据库中的旧数据（快速修复）

#### 步骤 1：登录 Railway 控制台

1. 访问：https://railway.app
2. 登录你的账号
3. 找到你的 PostgreSQL 数据库服务

#### 步骤 2：连接到数据库

1. 在数据库服务页面，点击 **"Connect"** 或 **"Query"**
2. 或者使用 Railway CLI：
   ```bash
   railway connect
   ```

#### 步骤 3：检查数据库大小

在数据库查询界面执行：

```sql
-- 查看数据库大小
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'railway';

-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 步骤 4：清理旧数据

**选项 A：删除已领取的内容（推荐）**

```sql
-- 查看已领取的内容数量
SELECT COUNT(*) FROM "Content" WHERE "claimedBy" IS NOT NULL;

-- 删除已领取的内容（谨慎操作！）
DELETE FROM "Content" WHERE "claimedBy" IS NOT NULL;

-- 或者只保留最近 100 条未领取的内容
DELETE FROM "Content" 
WHERE "id" NOT IN (
    SELECT "id" FROM "Content" 
    WHERE "claimedBy" IS NULL 
    ORDER BY "createdAt" DESC 
    LIMIT 100
);
```

**选项 B：删除所有内容（如果数据不重要）**

```sql
-- 清空内容表
TRUNCATE TABLE "Content" CASCADE;
```

**选项 C：清理 Base64 图片数据**

如果图片存储在 `images` 字段中（JSON 数组），可以：

```sql
-- 查看包含 Base64 数据的内容
SELECT COUNT(*) FROM "Content" 
WHERE "images"::text LIKE 'data:image%';

-- 删除包含 Base64 数据的内容（谨慎！）
DELETE FROM "Content" 
WHERE "images"::text LIKE 'data:image%';
```

#### 步骤 5：清理数据库空间

```sql
-- 清理未使用的空间
VACUUM FULL;

-- 或者只清理特定表
VACUUM FULL "Content";
```

---

### 方案 2：配置 AWS S3 存储图片（长期解决方案）

这是**最佳解决方案**，可以避免图片占用数据库空间。

#### 步骤 1：创建 AWS S3 Bucket

1. 访问：https://aws.amazon.com/s3/
2. 登录 AWS 控制台
3. 创建 S3 Bucket（选择离你最近的区域）

#### 步骤 2：创建 IAM 用户

1. 在 AWS 控制台 → IAM → Users
2. 创建新用户，只授予 S3 访问权限
3. 保存 Access Key ID 和 Secret Access Key

#### 步骤 3：在 Railway 配置环境变量

在 Railway 后端服务中添加以下环境变量：

```
AWS_ACCESS_KEY_ID=你的AccessKey
AWS_SECRET_ACCESS_KEY=你的SecretKey
AWS_REGION=us-east-1
AWS_S3_BUCKET=你的bucket名称
```

#### 步骤 4：重新部署

Railway 会自动重新部署，之后新上传的图片会存储到 S3，不再占用数据库空间。

---

### 方案 3：升级 Railway 数据库存储（临时方案）

如果数据很重要，不想删除：

1. 登录 Railway 控制台
2. 找到 PostgreSQL 数据库服务
3. 升级到付费计划（获得更多存储空间）
4. 或者创建新的数据库并迁移数据

---

## 🔧 预防措施

### 1. 定期清理旧数据

创建一个定时任务，自动清理已领取的内容：

```typescript
// 在 backend/src 中创建清理脚本
// 每天凌晨清理 7 天前已领取的内容
```

### 2. 监控数据库大小

定期检查数据库使用情况：

```sql
SELECT 
    pg_size_pretty(pg_database_size('railway')) AS database_size,
    pg_size_pretty(
        SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename))
        FROM pg_tables
        WHERE schemaname = 'public'
    ) AS tables_size;
```

### 3. 使用外部存储

**必须配置 AWS S3 或其他对象存储服务**，不要将图片存储在数据库中。

---

## 📊 数据库空间使用分析

### 检查哪些表占用空间最大：

```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size,
    pg_total_relation_size('public.' || tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

### 检查 Content 表中的数据：

```sql
-- 查看内容总数
SELECT COUNT(*) FROM "Content";

-- 查看已领取/未领取数量
SELECT 
    CASE WHEN "claimedBy" IS NULL THEN '未领取' ELSE '已领取' END AS status,
    COUNT(*) AS count
FROM "Content"
GROUP BY CASE WHEN "claimedBy" IS NULL THEN '未领取' ELSE '已领取' END;

-- 查看平均每条内容的图片大小（如果使用 Base64）
SELECT 
    AVG(LENGTH("images"::text)) AS avg_size_bytes,
    pg_size_pretty(AVG(LENGTH("images"::text))) AS avg_size
FROM "Content";
```

---

## ⚠️ 紧急操作步骤（如果服务完全无法使用）

### 1. 立即清理数据库

```sql
-- 删除所有已领取的内容
DELETE FROM "Content" WHERE "claimedBy" IS NOT NULL;

-- 清理空间
VACUUM FULL;
```

### 2. 重启服务

在 Railway 控制台重启后端服务。

### 3. 配置 S3（防止再次发生）

按照上面的"方案 2"配置 AWS S3。

---

## ✅ 验证修复

修复后，检查：

1. **数据库空间**：
   ```sql
   SELECT pg_size_pretty(pg_database_size('railway'));
   ```

2. **创建内容**：
   - 尝试在管理后台创建新内容
   - 应该不再出现 "No space left on device" 错误

3. **服务稳定性**：
   - 服务不再频繁重启
   - 日志中不再出现 "Killed" 消息

---

## 📝 总结

**当前问题**：数据库磁盘空间已满（Base64 图片占用大量空间）

**立即解决**：
1. ✅ 清理数据库中的旧数据
2. ✅ 执行 `VACUUM FULL` 释放空间

**长期解决**：
1. ✅ 配置 AWS S3 存储图片
2. ✅ 定期清理已领取的内容
3. ✅ 监控数据库使用情况

---

**最后更新**：2025-01-27

