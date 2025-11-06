# ⚡ AWS S3 快速配置指南（5分钟版）

## 🎯 快速步骤

### 1. 创建 S3 存储桶（2分钟）

1. **进入 S3 服务**：
   - 在 AWS Console 顶部搜索框输入 **"S3"**，然后点击搜索结果中的 "S3"
   - 或直接访问：https://console.aws.amazon.com/s3/
2. 进入后，点击右侧的 **"创建存储桶"** 按钮（橙色或蓝色的大按钮）
3. 填写：
   - **名称**：`xiaohongshu-images-你的用户名`（全局唯一）
   - **区域**：`us-east-1`
   - **阻止所有公共访问**：**取消勾选所有选项** ⚠️
4. 点击 **"创建存储桶"**

### 2. 配置存储桶权限（1分钟）

1. 进入存储桶 → **"权限"** 标签
2. **"存储桶策略"** → **"编辑"**
3. 粘贴以下策略（替换存储桶名称）：

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

4. 点击 **"保存更改"**

### 3. 创建 IAM 用户（1分钟）

1. 访问：https://console.aws.amazon.com/iam/
2. **"用户"** → **"创建用户"**
3. 用户名：`xiaohongshu-uploader`
4. 勾选 **"编程访问"**
5. **"下一步：权限"** → 搜索 `AmazonS3FullAccess` → 勾选
6. **"创建用户"**
7. **⚠️ 立即保存**：
   - 访问密钥 ID
   - 秘密访问密钥

### 4. 配置 Railway 环境变量（1分钟）

1. 访问：https://railway.app
2. 进入你的后端服务 → **"Variables"**
3. 添加以下 4 个变量：

```
AWS_ACCESS_KEY_ID=你的访问密钥ID
AWS_SECRET_ACCESS_KEY=你的秘密访问密钥
AWS_REGION=us-east-1
AWS_S3_BUCKET=你的存储桶名称
```

4. 保存，Railway 会自动重新部署

### 5. 验证（30秒）

1. 访问前端管理后台
2. 上传一张图片
3. 检查图片 URL 是否为 S3 地址（类似 `https://你的bucket.s3.us-east-1.amazonaws.com/...`）

---

## ✅ 完成！

如果图片上传成功且 URL 是 S3 地址，说明配置成功！

---

## 🆘 遇到问题？

查看详细指南：`AWS_S3_DEPLOYMENT_GUIDE.md`

