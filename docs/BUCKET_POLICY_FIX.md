# 🔧 存储桶策略修复指南

## 问题诊断

根据你提供的存储桶策略截图，**问题确认**：

### 当前策略分析

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

**问题点：**
- ✅ 允许 `s3:GetObject`（下载文件）
- ❌ **缺少 `s3:PutObject`**（上传文件）
- ⚠️ Principal 是 `"*"`（公共访问），但只适用于读取

### 为什么会导致上传失败？

虽然预签名URL上传主要依赖**IAM用户权限**，但如果：
1. 存储桶策略没有明确允许 `s3:PutObject`
2. 或者存储桶策略明确拒绝某些操作

可能会导致上传失败，特别是当使用预签名URL时。

## 解决方案

### 方案 1：添加 PutObject 权限到存储桶策略（推荐）

修改后的存储桶策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    },
    {
      "Sid": "AllowPutObjectForIAMUser",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER_NAME"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

**注意：**
- 将 `YOUR_ACCOUNT_ID` 替换为你的 AWS 账户 ID
- 将 `YOUR_IAM_USER_NAME` 替换为你的 IAM 用户名（用于生成预签名URL的用户）

### 方案 2：使用 IAM 用户 ARN（更安全）

如果你知道 IAM 用户的 ARN，可以直接使用：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    },
    {
      "Sid": "AllowPutObjectForIAMUser",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/your-iam-user"
      },
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

### 方案 3：允许特定 IAM 角色（如果使用角色）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    },
    {
      "Sid": "AllowPutObjectForIAMRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/your-iam-role"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

## 如何查找 IAM 用户信息

### 方法 1：通过 AWS 控制台

1. 登录 AWS 控制台
2. 进入 **IAM** 服务
3. 点击 **Users**（用户）
4. 找到用于生成预签名URL的用户
5. 查看用户的 **ARN**（格式：`arn:aws:iam::账户ID:user/用户名`）

### 方法 2：通过环境变量

检查你的后端环境变量：
- `AWS_ACCESS_KEY_ID` - 对应的 IAM 用户
- 在 IAM 控制台中查找这个 Access Key 对应的用户

### 方法 3：使用 AWS CLI

```bash
aws sts get-caller-identity
```

这会返回当前使用的 IAM 用户/角色的 ARN。

## 验证修复

修复后，运行深度诊断工具验证：

```bash
curl https://你的后端域名/api/upload/deep-diagnosis
```

检查以下测试项：
- ✅ `存储桶策略 > PutObject 权限` 应该显示 `pass`
- ✅ `存储桶策略 > 策略 Actions 分析` 应该包含 `s3:PutObject`

## 重要说明

### IAM 权限 vs 存储桶策略

1. **IAM 权限**：控制 IAM 用户/角色可以执行的操作
2. **存储桶策略**：存储桶级别的访问控制

对于预签名URL上传：
- 预签名URL的签名基于 **IAM 用户权限**
- 但存储桶策略可以**限制或允许**这些操作
- 如果存储桶策略没有明确允许，可能会阻止上传

### 最佳实践

1. **最小权限原则**：只授予必要的权限
2. **明确指定 Principal**：不要使用 `"*"` 来允许上传
3. **分离读写权限**：
   - 公共读取：`Principal: "*"` + `Action: s3:GetObject`
   - 授权上传：`Principal: IAM用户ARN` + `Action: s3:PutObject`

## 常见错误

### 错误 1：使用 `"*"` 作为上传的 Principal

```json
{
  "Principal": "*",
  "Action": "s3:PutObject"  // ❌ 这会允许任何人上传！
}
```

**问题**：这会允许任何人上传文件，存在安全风险。

### 错误 2：忘记添加 PutObjectAcl

如果上传时需要设置 ACL，还需要添加：

```json
{
  "Action": [
    "s3:PutObject",
    "s3:PutObjectAcl"  // 如果需要设置对象 ACL
  ]
}
```

## 测试上传

修复存储桶策略后，测试上传：

1. 访问前端页面
2. 尝试上传一个测试图片
3. 检查浏览器控制台的错误信息
4. 如果还有问题，运行深度诊断工具

---

**最后更新**：2025-11-06

