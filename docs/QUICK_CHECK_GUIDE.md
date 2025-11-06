# S3 上传配置快速检查指南

## 检查 2-4 的详细步骤

### ✅ 检查 2: 存储桶策略是否允许 PUT 操作

#### 方法 A: AWS 控制台（推荐）

1. **登录 AWS 控制台**
   - 访问：https://console.aws.amazon.com
   - 使用你的 AWS 账户登录

2. **进入 S3 服务**
   - 在服务搜索框中输入 "S3"
   - 点击 "S3" 服务

3. **选择存储桶**
   - 找到并点击存储桶：`xiaohongshu-images-xiaogao`

4. **查看权限配置**
   - 点击 **"权限" (Permissions)** 标签
   - 查看 **"存储桶策略" (Bucket policy)** 部分

5. **检查策略内容**
   - **如果有策略：**
     - 查找包含 `s3:PutObject` 的语句
     - 确认 `Effect` 为 `Allow`
     - 确认 `Resource` 包含 `arn:aws:s3:::xiaohongshu-images-xiaogao/*`
   - **如果没有策略：**
     - ✅ **这是正常的！** 只要 IAM 用户有 `s3:PutObject` 权限即可
     - 存储桶策略是可选的

#### 方法 B: 使用脚本检查

```bash
# 在项目根目录运行
node scripts/check-s3-upload-config.js
```

脚本会：
- 尝试读取存储桶策略
- 检查是否有允许 PUT 操作的策略
- 如果无法读取，会提示这是正常的（IAM 权限已足够）

#### 方法 C: 使用 AWS CLI

```bash
# 获取存储桶策略
aws s3api get-bucket-policy --bucket xiaohongshu-images-xiaogao

# 如果没有策略，会返回错误，这是正常的
```

---

### ✅ 检查 3: Content-Type 一致性

#### 自动检查（代码已实现）

代码中已经添加了自动验证，如果 Content-Type 不匹配，会在控制台显示错误：

```typescript
// 检查 Content-Type 是否匹配
if (file.type !== expectedContentType) {
  throw new Error('Content-Type 不匹配');
}
```

#### 手动检查步骤

1. **打开浏览器控制台（F12）**
2. **上传一张图片**
3. **查看控制台日志**，找到以下信息：

```javascript
📤 开始上传文件: {
  contentType: "image/jpeg",  // ← 前端使用的 Content-Type
  presignedUrlParams: {
    'Content-Type': "image/jpeg",  // ← 预签名 URL 中的 Content-Type
  }
}
```

4. **确认两个值完全一致**
   - ✅ 如果一致：`contentTypeMatch: true`
   - ❌ 如果不一致：会抛出错误并显示详细信息

#### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `file.type` 为空字符串 | 某些浏览器或文件类型 | 使用默认值：`file.type \|\| 'application/octet-stream'` |
| 大小写不一致 | `image/jpeg` vs `image/JPEG` | 确保大小写一致 |
| MIME 类型不同 | 浏览器差异 | 使用生成预签名 URL 时的相同值 |

#### 代码位置

- **后端生成预签名 URL：** `backend/src/upload/upload.service.ts:66`
- **前端获取预签名 URL：** `frontend/src/pages/AdminDashboard.tsx:138`
- **前端上传：** `frontend/src/pages/AdminDashboard.tsx:192`
- **验证逻辑：** `frontend/src/pages/AdminDashboard.tsx:190-202`

---

### ✅ 检查 4: 请求头配置

#### 自动检查（代码已实现）

代码中已经添加了验证，确保只设置 `Content-Type` 头：

```typescript
// 验证请求头（确保没有额外的头）
const headerKeys = Object.keys(requestHeaders);
if (headerKeys.length !== 1 || headerKeys[0] !== 'Content-Type') {
  throw new Error('上传时只能设置 Content-Type 请求头');
}
```

#### 手动检查步骤

1. **打开浏览器开发者工具（F12）**
2. **进入 Network 标签**
3. **上传一张图片**
4. **找到上传请求**（通常是 PUT 请求到 `s3.amazonaws.com`）
5. **点击请求，查看 Request Headers**

#### 正确的请求头

应该只有：
- ✅ `Content-Type: image/jpeg`（或其他图片类型）
- ✅ `User-Agent: ...`（浏览器自动添加，可以忽略）
- ✅ 其他浏览器自动添加的头（如 `Accept`、`Referer` 等，可以忽略）

#### 不应该有的请求头

- ❌ `Authorization: Bearer ...`（预签名 URL 已包含签名）
- ❌ `x-amz-acl: ...`（由 AWS SDK 自动处理）
- ❌ `x-amz-*` 任何头（由 AWS SDK 自动处理）
- ❌ `Cookie: ...`（如果设置了 `credentials: 'include'`）

#### 代码验证

**正确的代码（已实现）：**
```typescript
// ✅ 只设置 Content-Type
const requestHeaders: HeadersInit = {
  'Content-Type': file.type,
};

// ✅ 使用 fetch（不使用 axios）
const uploadResponse = await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: requestHeaders,
  credentials: 'omit',  // ✅ 不发送 credentials
});
```

**错误的代码（需要避免）：**
```typescript
// ❌ 错误 1: 使用 axios（可能自动添加请求头）
await axios.put(presignedUrl, file, {
  headers: { 'Content-Type': file.type }
});

// ❌ 错误 2: 添加 Authorization 头
headers: {
  'Content-Type': file.type,
  'Authorization': 'Bearer ...',  // ← 不要添加
}

// ❌ 错误 3: 添加 x-amz-* 头
headers: {
  'Content-Type': file.type,
  'x-amz-acl': 'public-read',  // ← 不要添加
}

// ❌ 错误 4: 使用 credentials: 'include'
credentials: 'include',  // ← 可能添加 Cookie 头
```

---

## 快速诊断命令

### 1. 运行检查脚本
```bash
node scripts/check-s3-upload-config.js
```

### 2. 检查后端配置
```bash
curl https://你的后端域名/api/upload/diagnose
```

### 3. 前端检查
1. 打开浏览器控制台（F12）
2. 上传文件
3. 查看控制台日志和 Network 标签

---

## 总结

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 1. IAM 权限 | ✅ 已确认 | IAM 用户有 `s3:PutObject` 权限 |
| 2. 存储桶策略 | ⚠️ 需检查 | 如果没有策略，只要 IAM 权限足够即可 |
| 3. Content-Type | ✅ 已实现自动检查 | 代码中已添加验证逻辑 |
| 4. 请求头 | ✅ 已实现自动检查 | 代码中已添加验证逻辑 |

---

## 如果仍然遇到 403 错误

1. **查看浏览器控制台日志**
   - 检查 Content-Type 是否匹配
   - 检查是否有错误信息

2. **查看 Network 标签**
   - 检查请求头是否只有 Content-Type
   - 查看响应内容（可能包含 AWS 错误信息）

3. **检查后端日志**
   - 查看预签名 URL 生成日志
   - 确认 Content-Type 参数

4. **等待权限生效**
   - IAM 权限更改可能需要 1-2 分钟生效

5. **重新生成预签名 URL**
   - 如果预签名 URL 已过期（5分钟），需要重新获取

