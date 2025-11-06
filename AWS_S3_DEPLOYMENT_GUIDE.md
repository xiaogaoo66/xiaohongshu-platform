# 🚀 AWS S3 完整部署指南

## 📋 部署概览

本指南将帮助你完成 AWS S3 的配置，解决数据库空间不足的问题。

**预计时间**：15-20 分钟  
**难度**：⭐️⭐️（简单）

---

## ✅ 前置要求

- [ ] AWS 账号（如果没有，需要注册）
- [ ] Railway 账号（已有）
- [ ] 信用卡（AWS 需要，但免费额度够用）

---

## 📝 第一步：注册/登录 AWS 账号

### 1.1 访问 AWS 官网

1. 打开浏览器，访问：https://aws.amazon.com/
2. 点击右上角 **"创建 AWS 账户"** 或 **"登录"**

### 1.2 注册新账号（如果还没有）

1. 填写邮箱地址和账户名称
2. 验证邮箱
3. 设置密码
4. **需要信用卡信息**（但免费套餐不会扣费）
5. 完成身份验证

**注意**：AWS 免费套餐包含：
- 5 GB S3 标准存储
- 2,000 次 PUT 请求/月
- 20,000 次 GET 请求/月
- 100 GB 数据传输/月

---

## 🪣 第二步：创建 S3 存储桶

### 2.1 进入 S3 控制台

**重要**：如果你现在在 AWS 控制台首页（Dashboard），需要先导航到 S3 服务。

**方法 1：使用顶部搜索栏（推荐，最快）**

1. 在 AWS Console 顶部导航栏，找到**搜索框**（通常在顶部中央，显示"搜索服务、功能、文档..."）
2. 在搜索框中输入 **"S3"**
3. 在搜索结果中，点击 **"S3"**（会显示为 "Simple Storage Service"）
4. 页面会跳转到 S3 控制台

**方法 2：使用服务菜单**

1. 点击顶部导航栏左侧的 **"服务"** 菜单（或 "Services"）
2. 在服务列表中，找到 **"存储"**（Storage）分类
3. 点击 **"S3"** 或 **"Simple Storage Service"**

**方法 3：直接访问**

1. 直接访问：https://console.aws.amazon.com/s3/
2. 如果未登录，会提示登录

**确认已进入 S3 页面**：
- 页面标题应该显示 "Amazon S3"
- 左侧菜单应该显示 "存储桶"（Buckets）
- 右侧应该有一个大的 **"创建存储桶"** 按钮（橙色或蓝色）

### 2.2 创建存储桶

1. 点击右侧 **"创建存储桶"** 按钮

2. **配置存储桶**：

   **基本信息**：
   - **存储桶名称**：`xiaohongshu-images-你的用户名`（必须全局唯一）
     - 例如：`xiaohongshu-images-john-2025`
     - 只能包含小写字母、数字、连字符
   - **AWS 区域**：选择 `us-east-1`（弗吉尼亚，最便宜）或 `ap-northeast-1`（东京，适合中国用户）
     - **推荐**：`us-east-1`（费用最低）

   **对象所有权**：
   - ✅ 选择 **"ACL 已禁用（推荐）"**（默认就是这个，保持即可）

   **阻止所有公共访问**：
   - ⚠️ **⚠️ 最重要：取消勾选 "阻止所有公开访问" 主复选框**
   - 取消后，下面的 4 个子选项会自动取消勾选
   - **为什么**：因为图片需要公开访问，所以必须允许公共读取
   - **如果忘记这一步**：后续无法通过存储桶策略允许公开访问

   **存储桶版本控制**：
   - ✅ 保持默认（禁用）

   **默认加密**：
   - ✅ 保持默认（使用 Amazon S3 托管密钥进行服务器端加密 (SSE-S3)）
   - ✅ 存储桶密钥：保持 "启用"（默认）

   **高级设置 - 对象锁定**：
   - ✅ 保持默认（禁用）

   **标记（可选）**：
   - 可以跳过，或添加标签便于管理

3. 点击 **"创建存储桶"**

### 2.3 配置存储桶权限（允许公开读取）

1. 进入你刚创建的存储桶
2. 点击 **"权限"** 标签页
3. 找到 **"存储桶策略"**，点击 **"编辑"**
4. 粘贴以下策略（**替换 `你的存储桶名称`**）：

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

**示例**（如果你的存储桶名称是 `xiaohongshu-images-john-2025`）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::xiaohongshu-images-john-2025/*"
    }
  ]
}
```

5. 点击 **"保存更改"**

6. 如果提示警告，点击 **"确认"**（因为我们确实需要公开读取）

### 2.4 配置 CORS 策略（重要！）

⚠️ **必须配置**：如果前端需要直接上传文件到 S3，必须配置 CORS 策略。

1. 在存储桶详情页，点击 **"权限"**（Permissions）标签页
2. 向下滚动，找到 **"跨源资源共享 (CORS)"**（Cross-origin resource sharing (CORS)）部分
3. 点击 **"编辑"**（Edit）按钮
4. 粘贴以下 JSON 配置（**替换前端域名为你的实际域名**）：

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "https://你的前端域名.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-request-id"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

**示例**（如果你的前端域名是 `xiaohongshu-platform.vercel.app`）：

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "https://xiaohongshu-platform.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        "ExposeHeaders": ["ETag", "x-amz-request-id"],
        "MaxAgeSeconds": 3600
    }
]
```

5. 点击 **"保存更改"**

**为什么需要 CORS？**
- 前端从浏览器直接上传文件到 S3（使用预签名 URL）
- 浏览器的同源策略会阻止跨域请求
- CORS 配置告诉浏览器允许来自指定域名的请求

**如果遇到 CORS 错误**，请参考 `FIX_S3_CORS_ERROR.md` 详细排查。

---

## 👤 第三步：创建 IAM 用户（获取访问密钥）

### 3.1 进入 IAM 控制台

1. 在 AWS Console 顶部搜索栏输入 **"IAM"**
2. 点击 **"IAM"** 服务

### 3.2 创建新用户

1. 在左侧菜单点击 **"用户"**
2. 点击 **"创建用户"** 按钮

### 3.3 配置用户信息

1. **用户名**：`xiaohongshu-uploader`（或任何你喜欢的名字）

2. **访问类型**：
   - ✅ 勾选 **"编程访问"**（提供访问密钥）
   - ❌ 不需要勾选 "AWS Management Console 访问"

3. 点击 **"下一步：权限"**

### 3.4 设置权限

⚠️ **重要**：必须添加 `AmazonS3FullAccess` 策略，否则会出现 403 Forbidden 错误！

1. 选择 **"直接附加现有策略"**
2. 在搜索框输入 **"S3"**
3. 找到并勾选 **`AmazonS3FullAccess`**
   - 这个策略允许用户完全访问 S3（上传、下载、删除等）
   - **必须包含 `s3:PutObject` 权限才能生成有效的预签名 URL**

4. 点击 **"下一步：标签"**（可选，直接跳过）

5. 点击 **"下一步：审核"**

6. 检查配置，然后点击 **"创建用户"**

**如果遇到 403 Forbidden 错误**，请参考 `FIX_S3_403_ERROR.md` 详细排查。

### 3.5 保存访问密钥（重要！）

⚠️ **重要**：访问密钥只显示一次，请立即保存！

1. 你会看到两个重要信息：
   - **访问密钥 ID**（Access Key ID）：类似 `AKIAIOSFODNN7EXAMPLE`
   - **秘密访问密钥**（Secret Access Key）：类似 `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

2. **立即保存到安全的地方**：
   - 复制到文本文件
   - 或使用密码管理器
   - **不要分享给任何人！**

3. 点击 **"完成"**

---

## 🔧 第四步：在 Railway 配置环境变量

### 4.1 进入 Railway 项目

1. 访问：https://railway.app
2. 登录你的账号
3. 找到你的后端服务（Backend）

### 4.2 添加环境变量

1. 点击你的后端服务
2. 点击 **"Variables"** 标签页
3. 点击 **"New Variable"** 或 **"Raw Editor"**

4. 添加以下 4 个环境变量：

```bash
AWS_ACCESS_KEY_ID=你的访问密钥ID
AWS_SECRET_ACCESS_KEY=你的秘密访问密钥
AWS_REGION=us-east-1
AWS_S3_BUCKET=你的存储桶名称
```

**示例**：

```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=xiaohongshu-images-john-2025
```

5. 点击 **"Save"** 或 **"Deploy"**

6. Railway 会自动重新部署你的服务

---

## ✅ 第五步：验证配置

### 5.1 检查 Railway 日志

1. 在 Railway 中，点击你的后端服务
2. 查看 **"Deployments"** 或 **"Logs"**
3. 应该看到服务正常启动，**不再有** "AWS S3 环境变量未配置" 的警告

### 5.2 测试图片上传

1. 访问你的前端管理后台
2. 尝试上传一张图片
3. 检查：
   - ✅ 上传成功
   - ✅ 图片可以正常显示
   - ✅ 浏览器开发者工具中，图片 URL 应该是 S3 地址（类似 `https://你的bucket.s3.us-east-1.amazonaws.com/uploads/xxx.jpg`）

### 5.3 检查 S3 存储桶

1. 回到 AWS S3 控制台
2. 进入你的存储桶
3. 应该能看到 `uploads/` 文件夹
4. 里面应该有刚上传的图片文件

---

## 🔍 故障排查

### 问题 1：图片上传失败

**症状**：上传时提示错误

**解决方案**：
1. 检查 Railway 环境变量是否正确配置
2. 检查访问密钥是否正确（没有多余空格）
3. 检查存储桶名称是否正确
4. 检查区域是否匹配（`AWS_REGION` 必须与存储桶区域一致）

### 问题 2：图片无法访问（403 Forbidden）

**症状**：图片上传成功，但无法在浏览器中打开

**解决方案**：
1. 检查存储桶策略是否正确配置（参考第二步）
2. 检查存储桶的"阻止所有公共访问"设置是否已取消勾选
3. 确认策略中的存储桶名称正确

### 问题 3：服务启动失败

**症状**：Railway 部署失败

**解决方案**：
1. 查看 Railway 日志，找到具体错误信息
2. 检查环境变量格式是否正确（没有引号，没有多余空格）
3. 确认所有 4 个环境变量都已添加

### 问题 4：仍然使用 Base64 编码

**症状**：上传后仍然使用 Base64，没有使用 S3

**解决方案**：
1. 检查 Railway 环境变量是否已保存
2. 确认服务已重新部署（查看部署时间）
3. 清除浏览器缓存，重新尝试上传

---

## 📊 费用监控

### 查看 AWS 费用

1. 访问 AWS Console → **"账单"**（Billing）
2. 可以查看当前费用和预测费用
3. 设置费用警报（当费用超过 $1 时通知你）

### 费用优化建议

1. **定期清理旧图片**：
   - 删除已领取且不再需要的内容
   - 可以编写脚本定期清理

2. **压缩图片**：
   - 在上传前压缩图片
   - 可以减少 50-80% 的存储空间

3. **使用生命周期规则**（可选）：
   - 自动将旧图片转移到更便宜的存储类型
   - 或自动删除超过一定时间的图片

---

## 🎉 完成！

恭喜！你已经成功配置了 AWS S3。现在：

- ✅ 图片不再存储在数据库中
- ✅ 数据库空间得到释放
- ✅ 图片上传和访问速度更快
- ✅ 成本更低（前 5 GB 免费）

---

## 📚 相关文档

- `AWS_S3_COST_ANALYSIS.md` - 详细的费用分析
- `DATABASE_DISK_SPACE_FIX.md` - 数据库空间问题修复指南
- `TROUBLESHOOTING_TIMEOUT.md` - 问题排查指南

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看 Railway 日志
2. 查看 AWS CloudWatch 日志（如果有）
3. 检查本文档的"故障排查"部分
4. 确认所有步骤都已正确完成

---

**最后更新**：2025-01-27

