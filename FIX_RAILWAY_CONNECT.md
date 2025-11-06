# 🔧 修复 Railway Connect 问题

## ❌ 问题分析

你遇到的两个问题：

1. **`railway connect` 失败**
   ```
   No linked project found. Run railway link to connect to a project
   ```
   - **原因**：当前目录没有链接到 Railway 项目
   - **解决**：需要先运行 `railway link`

2. **在命令行直接执行 SQL**
   ```
   'SELECT' 不是内部或外部命令
   ```
   - **原因**：SQL 命令不能在 Windows 命令行中直接执行
   - **解决**：SQL 需要在数据库客户端（如 `psql`）中执行，`railway connect` 会打开这个客户端

---

## ✅ 正确的操作步骤

### ⚠️ 重要提示

**如果 `railway link` 命令卡住了：**
- 这是正常的！命令正在等待你选择项目
- 使用 ↑↓ 方向键选择项目
- 按 **Enter** 确认选择
- 如果想取消，按 **Ctrl+C**

---

### 方案 1：使用 Railway CLI（需要交互）

#### 步骤 1：链接 Railway 项目

**执行位置：必须在 `backend` 目录下执行**

**Windows PowerShell 操作：**
```powershell
# 1. 打开 PowerShell 或终端
# 2. 进入项目根目录（如果还没进入）
cd D:\xrsp\video-render-api

# 3. 进入 backend 目录
cd backend

# 4. 执行 railway link
railway link
```

**或者直接在 backend 目录下打开终端：**
1. 在文件资源管理器中，导航到 `D:\xrsp\video-render-api\backend`
2. 在地址栏输入 `powershell` 或 `cmd` 然后按 Enter
3. 直接运行 `railway link`

**操作说明：**
- 会显示你的 Railway 项目列表
- 使用 ↑↓ 方向键选择你的项目（当前高亮的是 "zooming-flow"）
- 按 **Enter** 确认选择

**如果项目列表为空：**
- 说明你的账号下没有项目
- 需要先在 Railway 控制台创建项目

---

### 步骤 2：连接数据库

链接成功后，运行：

```bash
railway connect
```

**这会：**
- 自动检测项目中的数据库服务
- 打开 PostgreSQL 命令行客户端（`psql`）
- 你会看到类似这样的提示符：`railway=#`

**⚠️ 如果遇到错误：`psql must be installed to continue`**

这说明你的系统没有安装 PostgreSQL 客户端工具。有两个选择：

1. **安装 PostgreSQL 客户端**（见下方"安装 psql"部分）
2. **使用 Prisma Studio**（推荐，更简单，见下方"方案 2"）

---

### 步骤 3：在数据库客户端中执行 SQL

**现在**你可以在 `psql` 中执行 SQL 命令了：

```sql
-- 查看数据量
SELECT COUNT(*) FROM contents;

-- 删除所有内容数据
DELETE FROM contents;

-- 确认删除成功（应该返回 0）
SELECT COUNT(*) FROM contents;

-- 退出数据库客户端
\q
```

---

## 🎯 完整操作流程

```bash
# 1. 进入 backend 目录
cd backend

# 2. 链接 Railway 项目
railway link
# 选择你的项目，按回车

# 3. 连接数据库
railway connect
# 这会打开 psql 命令行

# 4. 在 psql 中执行 SQL（注意：现在是在数据库客户端中）
SELECT COUNT(*) FROM contents;
DELETE FROM contents;
SELECT COUNT(*) FROM contents;
\q
```

---

## 🔍 如果 `railway link` 失败

### 问题 1：没有项目

**错误信息：** 项目列表为空

**解决：**
1. 访问 https://railway.app
2. 登录你的账号
3. 创建新项目或检查是否有现有项目

### 问题 2：找不到项目

**解决：**
1. 在 Railway 控制台找到你的项目
2. 点击项目设置
3. 复制项目 ID
4. 使用项目 ID 链接：
   ```bash
   railway link --project <项目ID>
   ```

### 问题 3：权限问题

**解决：**
1. 确认你已登录正确的账号
2. 运行 `railway whoami` 检查当前登录用户
3. 如果不是正确的账号，运行 `railway logout` 然后重新登录

---

### 方案 2：使用 Prisma Studio（推荐，最简单）⭐

**如果你遇到 `psql must be installed` 错误，或者不想安装 psql，这是最简单的方法！**

#### 步骤 1：获取数据库连接字符串

1. 访问 https://railway.app
2. 登录并进入你的项目（zooming-flow）
3. 点击 **Postgres** 服务
4. 点击 **"Variables"** 或 **"Credentials"** 标签
5. 找到 `DATABASE_URL`，复制完整的连接字符串

#### 步骤 2：配置本地环境

在 `backend` 目录下创建或更新 `.env` 文件：

```env
DATABASE_URL="postgresql://postgres:密码@主机:5432/railway"
```

**注意：** 将上面复制的完整 `DATABASE_URL` 粘贴进去。

#### 步骤 3：运行 Prisma Studio

```bash
cd backend
npm run prisma:studio
```

**操作步骤：**
1. 运行上面的命令
2. 浏览器会自动打开 http://localhost:5555
3. 在界面中找到 `Contents` 表
4. 点击表名，查看所有数据
5. 可以批量选择并删除数据，或者使用 SQL 查询功能

**优点：**
- ✅ 不需要安装 `psql`
- ✅ 不需要 `railway link`
- ✅ 图形化界面，操作简单
- ✅ 可以直接看到数据
- ✅ 支持批量操作和 SQL 查询

**注意：** 确保你的 `.env` 文件中配置了正确的数据库连接字符串（`DATABASE_URL`）

---

## 📝 其他连接数据库的方法

如果 `railway connect` 仍然失败，可以使用以下方法：

### 方法 1：使用 Prisma Studio（推荐，最简单）

见上方的"方案 2"部分。

### 方法 2：安装 PostgreSQL 客户端（psql）

如果你想使用 `railway connect`，需要先安装 PostgreSQL 客户端：

#### Windows 安装方法：

**选项 A：使用 Chocolatey（推荐）**
```powershell
# 如果已安装 Chocolatey
choco install postgresql
```

**选项 B：使用 Scoop**
```powershell
# 如果已安装 Scoop
scoop install postgresql
```

**选项 C：手动安装**
1. 访问 https://www.postgresql.org/download/windows/
2. 下载 PostgreSQL 安装程序
3. 安装时选择"Command Line Tools"（只需要客户端工具，不需要完整数据库）
4. 安装完成后，重启命令行窗口

**验证安装：**
```bash
psql --version
```

如果显示版本号，说明安装成功。然后可以重新运行 `railway connect`。

### 方法 3：使用 psql 直接连接（如果已安装 psql）

1. **获取数据库连接信息**：
   - 在 Railway 控制台，点击 Postgres 服务
   - 点击 "Credentials" 或 "Variables" 标签
   - 复制 `DATABASE_URL` 或连接信息

2. **连接数据库**：
   ```bash
   psql "postgresql://postgres:密码@主机:5432/railway"
   ```

3. **执行 SQL**：
   ```sql
   DELETE FROM contents;
   ```

---

## ✅ 验证步骤

执行删除后，验证是否成功：

```sql
-- 在 psql 中执行
SELECT COUNT(*) FROM contents;
-- 应该返回 0
```

或者使用 Prisma Studio 查看 `Contents` 表，应该为空。

---

## 🎉 总结

**关键点：**
1. ✅ 必须先运行 `railway link` 链接项目
2. ✅ 然后运行 `railway connect` 连接数据库
3. ✅ SQL 命令必须在数据库客户端（psql）中执行，不能在 Windows 命令行中执行

**正确的流程：**
```
railway link → railway connect → 在 psql 中执行 SQL → \q 退出
```

---

**现在试试：**
```bash
cd backend
railway link
```

