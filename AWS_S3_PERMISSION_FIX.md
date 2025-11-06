# AWS S3 权限问题修复指南

## 问题描述

诊断工具显示：
- ✅ 配置信息正常（访问密钥、区域、存储桶名称都已配置）
- ❌ **无法访问存储桶: Forbidden**
- ✅ **可以生成预签名 URL**

## 问题原因

`headBucket` 操作需要 `s3:ListBucket` 权限，但当前 IAM 用户缺少此权限。

**重要说明**：即使显示无法访问存储桶，**预签名 URL 上传功能仍然可以正常工作**，因为：
- 生成预签名 URL 只需要签名权限（有访问密钥即可）
- 实际上传文件时使用的是预签名 URL 中的权限，而不是 IAM 用户的直接权限

## 解决方案

### 方案 1：添加 ListBucket 权限（推荐）

在 AWS IAM 控制台为你的 IAM 用户添加以下权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao"
    }
  ]
}
```

### 方案 2：完整 S3 权限（如果方案 1 不够）

如果需要完整的上传、下载、删除功能，使用以下权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::xiaohongshu-images-xiaogao",
        "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
      ]
    }
  ]
}
```

### 方案 3：忽略此错误（如果功能正常）

如果预签名 URL 上传功能正常工作，可以忽略这个错误。这个错误只是诊断信息，不影响实际使用。

## 验证步骤

1. 在 AWS IAM 控制台添加权限
2. 等待 1-2 分钟让权限生效
3. 在前端点击"重新测试"按钮
4. 检查是否显示 "✅ 可以访问存储桶"

## 当前配置信息

- **区域**: us-east-2
- **存储桶**: xiaohongshu-images-xiaogao
- **访问密钥**: AKIARLX2...（已配置）

## 注意事项

1. **权限生效时间**：IAM 权限更改可能需要 1-2 分钟才能生效
2. **存储桶区域**：确保 `AWS_REGION` 环境变量与存储桶实际区域匹配
3. **存储桶名称**：确保 `AWS_S3_BUCKET` 环境变量中的存储桶名称正确
4. **CORS 配置**：如果前端直接上传到 S3，需要配置存储桶的 CORS 策略

