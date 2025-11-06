# S3 上传 403 错误排查指南

## 检查清单

### ✅ 1. IAM 用户权限（已确认）
- [x] IAM 用户有 `s3:PutObject` 权限

### 📋 2. 存储桶策略是否允许 PUT 操作

#### 方法 1: 使用 AWS 控制台检查

1. 登录 AWS 控制台
2. 进入 S3 服务
3. 选择你的存储桶（`xiaohongshu-images-xiaogao`）
4. 点击 **"权限" (Permissions)** 标签
5. 查看 **"存储桶策略" (Bucket policy)**

#### 检查要点：

**如果存储桶策略存在：**
- 查找包含 `s3:PutObject` 的策略语句
- 确认 `Effect` 为 `Allow`
- 确认 `Principal` 包含你的 IAM 用户或 `*`（公共访问）
- 确认 `Resource` 包含你的存储桶路径（如 `arn:aws:s3:::xiaohongshu-images-xiaogao/*`）

**示例策略（允许 PUT 操作）：**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPutObject",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

**如果存储桶策略不存在：**
- 这是**正常的**！只要 IAM 用户有 `s3:PutObject` 权限，就可以上传
- 存储桶策略是可选的，主要用于：
  - 允许其他 AWS 账户访问
  - 设置公共访问策略
  - 添加额外的安全限制

#### 方法 2: 使用脚本检查

运行检查脚本：
```bash
node scripts/check-s3-upload-config.js
```

脚本会：
- 尝试读取存储桶策略
- 检查是否有允许 PUT 操作的策略
- 如果无法读取（权限不足），会提示这是正常的

---

### 📋 3. Content-Type 一致性检查

#### 问题说明

预签名 URL 的签名是基于特定的请求头和参数生成的。如果上传时的 `Content-Type` 与生成预签名 URL 时的 `contentType` 不一致，AWS 会拒绝请求并返回 403。

#### 代码检查

**后端生成预签名 URL（`backend/src/upload/upload.service.ts`）：**
```typescript
const params = {
  Bucket: bucket,
  Key: key,
  ContentType: contentType,  // ← 这里
};
```

**前端获取预签名 URL（`frontend/src/pages/AdminDashboard.tsx`）：**
```typescript
const response = await uploadAPI.getPresignedUrl(file.name, file.type)
//                                                              ↑ 这里传入 file.type
```

**前端上传（`frontend/src/pages/AdminDashboard.tsx`）：**
```typescript
const requestHeaders: HeadersInit = {
  'Content-Type': file.type,  // ← 这里使用 file.type
};
```

#### 验证逻辑

代码中已经添加了验证：
```typescript
// 检查 Content-Type 是否匹配
const expectedContentType = urlParams['Content-Type'];
if (file.type !== expectedContentType) {
  throw new Error('Content-Type 不匹配');
}
```

#### 常见问题

1. **空 Content-Type**
   - 如果 `file.type` 为空字符串，需要设置默认值
   - 建议：`file.type || 'application/octet-stream'`

2. **大小写敏感**
   - `image/jpeg` ≠ `image/JPEG`
   - 确保大小写一致

3. **浏览器差异**
   - 某些浏览器可能返回不同的 MIME 类型
   - 建议：在获取预签名 URL 时记录 `file.type`，上传时使用相同的值

#### 调试方法

打开浏览器控制台（F12），查看上传日志：
```javascript
📤 开始上传文件: {
  contentType: "image/jpeg",
  presignedUrlParams: {
    'Content-Type': "image/jpeg",  // ← 检查这两个值是否一致
  }
}
```

---

### 📋 4. 请求头配置检查

#### 问题说明

预签名 URL 的签名包含了所有需要签名的请求头。如果上传时添加了额外的请求头（如 `Authorization`、`x-amz-*` 等），会导致签名验证失败，返回 403。

#### 正确的配置

**前端上传代码（`frontend/src/pages/AdminDashboard.tsx`）：**
```typescript
// ✅ 正确：只设置 Content-Type
const requestHeaders: HeadersInit = {
  'Content-Type': file.type,
};

const uploadResponse = await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: requestHeaders,
  credentials: 'omit',  // ✅ 不发送 credentials
});
```

#### 需要避免的错误

1. **❌ 不要使用 axios**
   ```typescript
   // ❌ 错误：axios 可能自动添加请求头
   await axios.put(presignedUrl, file, {
     headers: { 'Content-Type': file.type }
   });
   ```
   - axios 可能自动添加 `Authorization` 头
   - axios 可能添加其他默认请求头

2. **❌ 不要添加 Authorization 头**
   ```typescript
   // ❌ 错误：预签名 URL 已包含签名
   headers: {
     'Content-Type': file.type,
     'Authorization': 'Bearer ...',  // ← 不要添加
   }
   ```

3. **❌ 不要添加 x-amz-* 头**
   ```typescript
   // ❌ 错误：这些由 AWS SDK 自动处理
   headers: {
     'Content-Type': file.type,
     'x-amz-acl': 'public-read',  // ← 不要添加
   }
   ```

4. **❌ 不要设置 credentials: "include"**
   ```typescript
   // ❌ 错误：可能添加 Cookie 头
   credentials: 'include',  // ← 不要使用
   ```

#### 验证方法

打开浏览器开发者工具（F12）：
1. 进入 **Network** 标签
2. 选择上传请求
3. 查看 **Request Headers**
4. 确认只有 `Content-Type` 头（可能还有浏览器自动添加的头，如 `User-Agent`）

#### 代码验证

代码中已经添加了验证：
```typescript
// 验证请求头（确保没有额外的头）
const headerKeys = Object.keys(requestHeaders);
if (headerKeys.length !== 1 || headerKeys[0] !== 'Content-Type') {
  throw new Error('上传时只能设置 Content-Type 请求头');
}
```

---

## 快速检查脚本

运行以下命令进行完整检查：

```bash
# 1. 检查存储桶策略和配置
node scripts/check-s3-upload-config.js

# 2. 检查后端配置
curl https://你的后端域名/api/upload/diagnose

# 3. 前端检查
# 打开浏览器控制台（F12），上传文件时查看日志
```

## 常见错误和解决方案

### 错误 1: 403 Forbidden - SignatureDoesNotMatch

**原因：** Content-Type 不匹配或添加了额外的请求头

**解决：**
1. 检查浏览器控制台的日志，确认 `contentType` 和 `expectedContentType` 是否一致
2. 检查 Network 标签中的请求头，确认只有 `Content-Type`
3. 确保使用 `fetch` 而不是 `axios`

### 错误 2: 403 Forbidden - AccessDenied

**原因：** IAM 权限不足或存储桶策略限制

**解决：**
1. 确认 IAM 用户有 `s3:PutObject` 权限
2. 检查存储桶策略是否允许 PUT 操作
3. 等待 1-2 分钟让权限生效

### 错误 3: 403 Forbidden - InvalidAccessKeyId

**原因：** AWS 凭证配置错误

**解决：**
1. 检查环境变量 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`
2. 确认 IAM 用户状态为活跃
3. 重新生成访问密钥

## 参考资源

- [AWS S3 预签名 URL 文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [存储桶策略文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [IAM 权限文档](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html)

