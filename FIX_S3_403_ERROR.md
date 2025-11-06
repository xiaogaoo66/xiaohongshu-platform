# 🔧 修复 S3 403 Forbidden 错误

## 📋 问题描述

**错误信息**：
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
批量图片上传错误: Error: 上传失败: 403 Forbidden
```

**原因**：
- ⚠️ **最常见**：后端使用了错误的访问密钥（不是有权限的 IAM 用户的密钥）
- IAM 用户权限不足（无法生成有效的预签名 URL）
- 存储桶策略不允许 PUT 操作
- IAM 用户没有 `s3:PutObject` 权限
- 区域或存储桶名称配置不匹配

---

## 🚨 快速诊断

**如果你已经添加了 `AmazonS3FullAccess` 策略但仍然出现 403 错误**：

1. 在 IAM 用户详情页，查看 **"访问密钥"** 状态
2. 如果显示 **"从未使用"**，说明后端可能在使用旧的访问密钥
3. **请先查看** `FIX_403_WITH_CORRECT_KEY.md` - 这是最常见的原因！

**如果访问密钥显示"已使用"但仍然 403**，继续查看下面的解决方案。

---

## ✅ 解决方案

### 方案 1：检查并修复 IAM 用户权限（推荐）

#### 步骤 1：登录 AWS 控制台

1. 访问：https://console.aws.amazon.com/
2. 登录你的 AWS 账号

#### 步骤 2：进入 IAM 控制台

1. 在顶部搜索栏输入 **"IAM"**
2. 点击 **"IAM"** 服务

#### 步骤 3：找到你的 IAM 用户

1. 在左侧菜单点击 **"用户"**（Users）
2. 找到你用于上传的 IAM 用户（例如：`xiaohongshu-uploader`）
3. 点击用户名进入详情页

#### 步骤 4：检查权限策略

1. 在用户详情页，找到 **"权限"**（Permissions）标签页
2. 查看附加的策略列表

**应该看到以下策略之一**：
- ✅ `AmazonS3FullAccess`（推荐，包含所有 S3 权限）
- ✅ 或者自定义策略包含 `s3:PutObject` 权限

**如果没有看到这些策略**，继续下一步。

#### 步骤 5：添加权限策略

**方法 A：添加完整 S3 访问权限（最简单）**

1. 在用户详情页的 **"权限"** 标签页，点击 **"添加权限"**（Add permissions）
2. 选择 **"直接附加现有策略"**（Attach policies directly）
3. 在搜索框中输入 `S3Full`
4. 勾选 **`AmazonS3FullAccess`**
5. 点击 **"下一步"** → **"添加权限"**

**方法 B：创建自定义策略（更安全，推荐生产环境）**

1. 在 IAM 控制台左侧菜单，点击 **"策略"**（Policies）
2. 点击 **"创建策略"**（Create policy）
3. 切换到 **"JSON"** 标签页
4. 粘贴以下策略（**替换存储桶名称为你的实际存储桶名称**）：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPutObject",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::你的存储桶名称/*"
        },
        {
            "Sid": "AllowListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::你的存储桶名称"
        }
    ]
}
```

**示例**（如果你的存储桶是 `xiaohongshu-images-xiaogao`）：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPutObject",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
        },
        {
            "Sid": "AllowListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao"
        }
    ]
}
```

5. 点击 **"下一步"**
6. 输入策略名称：`S3UploadPolicy`（或任何你喜欢的名字）
7. 点击 **"创建策略"**
8. 返回用户详情页，点击 **"添加权限"** → **"直接附加现有策略"**
9. 搜索你刚创建的策略名称，勾选并附加

---

### 方案 2：检查存储桶策略

存储桶策略应该允许公开读取，但不应该阻止 PUT 操作。

#### 步骤 1：进入 S3 控制台

1. 在 AWS Console 顶部搜索栏输入 **"S3"**
2. 点击 **"S3"** 服务
3. 选择你的存储桶

#### 步骤 2：检查存储桶策略

1. 点击 **"权限"**（Permissions）标签页
2. 找到 **"存储桶策略"**（Bucket policy）
3. 查看当前策略

**正确的存储桶策略示例**：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::你的存储桶名称/*"
    }
  ]
}
```

**重要**：
- ✅ 存储桶策略只需要允许 `s3:GetObject`（公开读取）
- ✅ **不需要**在存储桶策略中添加 `s3:PutObject`（这是通过 IAM 用户权限控制的）
- ❌ 如果存储桶策略中有 `"Effect": "Deny"` 的规则，可能会阻止上传

#### 步骤 3：检查阻止公共访问设置

1. 在 **"权限"** 标签页，找到 **"阻止公共访问"**（Block public access）
2. 点击 **"编辑"**
3. **取消勾选所有选项**（允许公共读取）
4. 点击 **"保存更改"**

---

### 方案 3：验证 AWS 环境变量

确保后端环境变量配置正确：

1. **AWS_ACCESS_KEY_ID** - IAM 用户的访问密钥 ID
2. **AWS_SECRET_ACCESS_KEY** - IAM 用户的秘密访问密钥
3. **AWS_REGION** - 存储桶所在区域（例如：`us-east-2`）
4. **AWS_S3_BUCKET** - 存储桶名称（例如：`xiaohongshu-images-xiaogao`）

**检查方法**：
- 如果使用 Railway：在 Railway 项目设置中检查环境变量
- 如果使用本地开发：检查 `backend/.env` 文件

**重要**：
- ✅ 确保使用的是**正确的 IAM 用户**的访问密钥
- ✅ 确保 IAM 用户有 `s3:PutObject` 权限
- ✅ 确保区域（Region）与存储桶所在区域一致

---

## 🧪 验证修复

### 步骤 1：等待权限生效

IAM 权限更改通常立即生效，但建议等待 1-2 分钟。

### 步骤 2：重新部署后端（如果使用 Railway）

如果修改了 IAM 权限，可能需要重新部署后端服务：

1. 在 Railway 项目中，触发重新部署
2. 等待部署完成

### 步骤 3：清除浏览器缓存

1. 按 `Ctrl+Shift+Delete` 清除浏览器缓存
2. 或者按 `Ctrl+Shift+R` 硬刷新页面

### 步骤 4：测试上传

1. 访问前端管理后台
2. 打开浏览器开发者工具（F12）
3. 切换到 **"控制台"**（Console）标签
4. 尝试上传一张图片
5. **应该不再出现 403 错误**

### 步骤 5：检查网络请求

1. 在开发者工具中，切换到 **"网络"**（Network）标签
2. 尝试上传图片
3. 找到对 S3 的 PUT 请求
4. 查看响应状态码：
   - ✅ `200 OK`：上传成功
   - ❌ `403 Forbidden`：权限仍然不足，继续排查

---

## 🔍 故障排查

### 问题 1：添加权限后仍然报 403

**可能原因**：
- 使用了错误的 IAM 用户访问密钥
- 区域配置不正确
- 存储桶名称配置不正确

**解决方案**：
1. 确认后端环境变量中的 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY` 对应的是有权限的 IAM 用户
2. 确认 `AWS_REGION` 与存储桶所在区域一致
3. 确认 `AWS_S3_BUCKET` 与存储桶名称完全一致（区分大小写）

### 问题 2：不确定 IAM 用户是否有权限

**测试方法**：
1. 在 IAM 控制台，找到你的 IAM 用户
2. 点击 **"权限"** 标签页
3. 点击 **"模拟策略"**（Simulate policy）或查看附加的策略
4. 确认策略中包含 `s3:PutObject` 权限

### 问题 3：存储桶在不同区域

**检查方法**：
1. 在 S3 控制台，查看存储桶列表
2. 找到你的存储桶，查看 **"区域"**（Region）列
3. 确保后端环境变量 `AWS_REGION` 与存储桶区域一致

**常见区域代码**：
- `us-east-1` - 美国东部（弗吉尼亚北部）
- `us-east-2` - 美国东部（俄亥俄）
- `ap-northeast-1` - 亚太地区（东京）
- `eu-west-1` - 欧洲（爱尔兰）

### 问题 4：预签名 URL 格式问题

如果预签名 URL 中包含 `signedHeaders=host:1`，这通常是正常的。问题在于权限，而不是 URL 格式。

---

## 📝 完整权限检查清单

在修复 403 错误时，请确认以下所有项：

- [ ] IAM 用户已附加 `AmazonS3FullAccess` 策略，或自定义策略包含 `s3:PutObject` 权限
- [ ] 后端环境变量 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY` 对应正确的 IAM 用户
- [ ] 后端环境变量 `AWS_REGION` 与存储桶所在区域一致
- [ ] 后端环境变量 `AWS_S3_BUCKET` 与存储桶名称完全一致
- [ ] 存储桶策略允许 `s3:GetObject`（公开读取）
- [ ] 存储桶的"阻止公共访问"设置已正确配置
- [ ] CORS 策略已配置（参考 `FIX_S3_CORS_ERROR.md`）
- [ ] 后端服务已重新部署（如果使用 Railway）

---

## 🎉 完成！

修复完成后：
- ✅ 前端可以正常上传图片到 S3
- ✅ 不再出现 403 Forbidden 错误
- ✅ 图片上传成功并可以正常访问

---

## 📚 相关文档

- `FIX_S3_CORS_ERROR.md` - 修复 CORS 错误指南
- `AWS_S3_DEPLOYMENT_GUIDE.md` - S3 完整部署指南
- `AWS_S3_QUICK_START.md` - S3 快速开始指南

---

**最后更新**：2025-01-27

