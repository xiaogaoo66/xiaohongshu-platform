# 🗑️ 删除数据库内容 - 详细操作步骤

## 📍 当前状态

你现在在 Railway 的 PostgreSQL 数据库管理界面，看到了三个表：
- `_prisma_migrations` - Prisma 迁移表（不要删除）
- `admins` - 管理员表
- `contents` - 内容表（要删除的数据）

---

## 🎯 方法 1：点击 "Connect" 按钮（最简单）

### 步骤：

1. **点击紫色的 "Connect" 按钮**（在 "Data" 标签右侧）
   - 这会打开一个数据库连接工具或 SQL 查询界面

2. **如果打开了查询界面**：
   - 在 SQL 编辑器中输入以下命令：

```sql
-- 先查看有多少条数据
SELECT COUNT(*) FROM contents;

-- 删除所有内容数据（保留表结构）
DELETE FROM contents;

-- 如果也要删除管理员数据（注意：删除后需要重新注册管理员）
-- DELETE FROM admins;
```

3. **点击 "Run" 或 "Execute" 按钮执行**

---

## 🎯 方法 2：点击表卡片查看数据

### 步骤：

1. **点击 `contents` 表卡片**
   - 这会打开表的数据视图

2. **在数据视图中**：
   - 可能会看到 "Delete" 或 "Trash" 图标
   - 可以选择单条或多条记录删除
   - 或者查找 "SQL Query" 或 "Query" 按钮来执行 SQL

3. **如果看到 SQL 查询选项**：
   - 执行上面的 SQL 命令

---

## 🎯 方法 3：使用 Railway CLI（如果界面没有 SQL 编辑器）

### 步骤：

1. **打开终端/命令行**

2. **安装 Railway CLI**（如果还没安装）：
```bash
npm i -g @railway/cli
```

3. **登录 Railway**：
```bash
railway login
```

4. **连接到数据库**：
```bash
railway connect
```

5. **执行 SQL 命令**：
```sql
-- 查看数据
SELECT COUNT(*) FROM contents;

-- 删除所有内容
DELETE FROM contents;

-- 退出
\q
```

---

## ⚠️ 重要提示

### 删除前确认：

1. **`_prisma_migrations` 表**：❌ **不要删除**，这是 Prisma 的迁移记录表
2. **`admins` 表**：⚠️ **谨慎删除**，删除后需要重新注册管理员账户
3. **`contents` 表**：✅ **可以删除**，这是你要清理的内容数据

### 推荐的删除顺序：

```sql
-- 1. 先查看数据量
SELECT COUNT(*) FROM contents;
SELECT COUNT(*) FROM admins;

-- 2. 只删除已领取的内容（推荐）
DELETE FROM contents WHERE "isClaimed" = true;

-- 3. 或者删除所有内容（如果你想清空所有）
DELETE FROM contents;

-- 4. 管理员表通常不需要删除，除非你要重置所有账户
```

---

## 🔍 如果找不到 SQL 编辑器

如果点击 "Connect" 后没有看到 SQL 查询界面，可以尝试：

1. **查看是否有其他标签**：
   - 在 "Data"、"Extensions"、"Credentials" 旁边是否有 "Query" 或 "SQL" 标签

2. **点击表卡片后查找**：
   - 点击 `contents` 表，在数据视图顶部查找 "Query" 或 "SQL Editor" 按钮

3. **使用外部工具**：
   - 获取连接信息（在 "Credentials" 标签中）
   - 使用 pgAdmin、DBeaver 等工具连接

---

## ✅ 删除后验证

删除完成后，可以执行：

```sql
-- 确认 contents 表已清空
SELECT COUNT(*) FROM contents;

-- 应该返回 0
```

---

## 📞 需要帮助？

如果遇到问题：
- 截图当前界面，我可以帮你定位 SQL 编辑器
- 或者使用 Railway CLI 方法（方法 3），更直接可靠

