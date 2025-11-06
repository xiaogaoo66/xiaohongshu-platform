# 🔍 403 Forbidden 错误详细诊断指南

## 问题现象

- ✅ 预签名 URL 可以成功生成
- ❌ 实际上传时返回 403 Forbidden

## 可能原因

### 1. IAM 用户权限不足（最常见）

**症状**：预签名 URL 可以生成，但上传时 403

**原因**：IAM 用户有签名权限，但缺少 `s3:PutObject` 权限

**解决方案**：
1. 登录 AWS IAM 控制台
2. 找到你的 IAM 用户
3. 添加以下权限策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::你的存储桶名称/*"
    }
  ]
}
```

或者直接附加 `AmazonS3FullAccess` 策略（最简单）

### 2. 存储桶策略阻止上传

**检查方法**：
1. 登录 AWS S3 控制台
2. 选择你的存储桶
3. 点击"权限"标签页
4. 查看"存储桶策略"

**如果存储桶策略存在**，确保包含：

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::你的账户ID:user/你的IAM用户名"
  },
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::你的存储桶名称/*"
}
```

### 3. 请求头不匹配

**症状**：预签名 URL 生成成功，但上传时签名验证失败

**原因**：上传时的请求头与生成签名时不一致

**解决方案**：
- 确保前端上传时只设置 `Content-Type` 请求头
- 不要添加其他请求头（如 `Authorization`、`x-amz-*` 等）
- 确保 `Content-Type` 与生成预签名 URL 时传入的 `contentType` 完全一致

### 4. 区域或存储桶名称不匹配

**检查方法**：
1. 在 S3 控制台查看存储桶的实际区域
2. 确保后端 `AWS_REGION` 环境变量与存储桶区域一致
3. 确保后端 `AWS_S3_BUCKET` 环境变量与存储桶名称完全一致（大小写敏感）

## 诊断步骤

### 步骤 1：检查后端日志

查看后端控制台输出，查找：
- `🔍 生成预签名 URL:` - 确认参数正确
- `✅ 预签名 URL 生成成功:` - 确认 URL 生成成功
- `❌ 生成预签名URL失败:` - 如果有此错误，说明权限不足

### 步骤 2：检查前端控制台

打开浏览器开发者工具，查看：
- `📤 开始上传文件:` - 确认上传参数
- `❌ 上传失败:` - 查看详细错误信息

### 步骤 3：测试 IAM 用户权限

在 AWS IAM 控制台：
1. 找到你的 IAM 用户
2. 点击"权限"标签页
3. 点击"模拟策略"（Simulate policy）
4. 测试 `s3:PutObject` 权限

### 步骤 4：检查存储桶策略

在 S3 控制台：
1. 选择你的存储桶
2. 点击"权限"标签页
3. 查看"存储桶策略"和"阻止公共访问"设置

## 快速修复清单

- [ ] IAM 用户已附加 `AmazonS3FullAccess` 策略
- [ ] 后端环境变量 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY` 正确
- [ ] 后端环境变量 `AWS_REGION` 与存储桶区域一致
- [ ] 后端环境变量 `AWS_S3_BUCKET` 与存储桶名称完全一致
- [ ] 前端上传时只设置 `Content-Type` 请求头
- [ ] 前端上传时的 `Content-Type` 与生成预签名 URL 时的 `contentType` 一致
- [ ] 存储桶策略允许 `s3:PutObject` 操作
- [ ] 后端服务已重新启动（如果修改了环境变量）

## 如果仍然 403

1. **检查访问密钥状态**：
   - 在 IAM 控制台查看访问密钥的"最后使用"时间
   - 如果显示"从未使用"，说明后端可能在使用错误的访问密钥

2. **测试预签名 URL**：
   - 使用 curl 或 Postman 测试预签名 URL
   - 确保请求方法和请求头正确

3. **查看 AWS CloudTrail**：
   - 在 AWS CloudTrail 中查看被拒绝的请求
   - 查看详细的错误原因

## 相关文档

- `FIX_S3_403_ERROR.md` - 403 错误修复指南
- `FIX_403_WITH_CORRECT_KEY.md` - 访问密钥问题修复
- `AWS_S3_PERMISSION_FIX.md` - 权限问题修复

