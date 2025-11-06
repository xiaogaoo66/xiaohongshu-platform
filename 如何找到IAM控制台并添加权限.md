# 🔍 如何找到 AWS IAM 控制台并添加 s3:ListBucket 权限

## 📍 方法 1：通过 AWS 控制台顶部搜索（最简单）

### 步骤 1：登录 AWS 控制台

1. 访问：https://console.aws.amazon.com/
2. 使用你的 AWS 账号登录

### 步骤 2：搜索 IAM

1. 在页面**顶部**，你会看到一个**搜索框**（通常显示 "搜索服务、功能..." 或 "Search services, features..."）
   - 位置：AWS 控制台顶部中间，通常有一个 🔍 搜索图标
   - 如果找不到，也可以点击左上角的 **"☰"**（三条横线）菜单图标
2. 在搜索框中输入：**`IAM`**
3. 在搜索结果中，点击 **"IAM"**（Identity and Access Management）

**提示**：如果你看到的是英文界面，搜索框可能显示 "Search services, features..."，输入 `IAM` 即可。

### 步骤 3：进入 IAM 控制台

点击后，你会进入 IAM 控制台，左侧菜单会显示：
- 访问管理
- 用户
- 组
- 角色
- 策略
- 等等...

---

## 📍 方法 2：直接访问 IAM 控制台链接

如果你已经登录 AWS 控制台，可以直接访问：

**https://console.aws.amazon.com/iam/**

---

## 📍 方法 3：通过服务菜单

### 步骤 1：找到服务菜单

1. 在 AWS 控制台顶部，点击 **"服务"**（Services）菜单
2. 或者点击左上角的 **"☰"**（三条横线）图标

### 步骤 2：找到 IAM

1. 在服务列表中，找到 **"安全、身份与合规"**（Security, Identity, & Compliance）分类
2. 点击 **"IAM"**（Identity and Access Management）

---

## ✅ 找到 IAM 控制台后，如何添加 s3:ListBucket 权限

### 方法 A：附加 AmazonS3FullAccess 策略（推荐，最简单）

这个方法会添加所有 S3 权限，包括 `s3:ListBucket`。

#### 步骤 1：找到你的 IAM 用户

1. 在 IAM 控制台左侧菜单，点击 **"用户"**（Users）
2. 在用户列表中，找到你的用户（例如：`xiaogao-uploader`）
3. 点击用户名进入详情页

#### 步骤 2：查看当前权限

1. 在用户详情页，点击 **"权限"**（Permissions）标签
2. 查看 **"权限策略"**（Permissions policies）部分
3. 如果已经看到 `AmazonS3FullAccess`，说明权限已经存在，无需添加

#### 步骤 3：添加权限（如果还没有）

1. 点击 **"添加权限"**（Add permissions）按钮
2. 选择 **"直接附加现有策略"**（Attach policies directly）
3. 在搜索框中输入：**`S3Full`**
4. 找到并勾选 **`AmazonS3FullAccess`**
   - 这个策略包含所有 S3 权限，包括：
     - `s3:ListBucket`
     - `s3:PutObject`
     - `s3:GetObject`
     - `s3:DeleteObject`
     - 等等...
5. 点击 **"下一步"**（Next）
6. 点击 **"添加权限"**（Add permissions）

#### 步骤 4：验证权限已添加

1. 返回用户详情页的 **"权限"** 标签
2. 确认 **`AmazonS3FullAccess`** 已出现在权限列表中
3. 等待 **1-2 分钟**让权限生效

---

### 方法 B：创建自定义策略（只添加 s3:ListBucket）

如果你只想添加 `s3:ListBucket` 权限，可以创建自定义策略。

#### 步骤 1：创建自定义策略

1. 在 IAM 控制台左侧菜单，点击 **"策略"**（Policies）
2. 点击 **"创建策略"**（Create policy）按钮
3. 点击 **"JSON"** 标签
4. 粘贴以下策略（替换 `你的存储桶名称`）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::你的存储桶名称"
    }
  ]
}
```

**例如**，如果你的存储桶是 `xiaohongshu-images-xiaogao`：

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

5. 点击 **"下一步"**（Next）
6. 输入策略名称：`S3ListBucketPolicy`（或任何你喜欢的名字）
7. 点击 **"创建策略"**（Create policy）

#### 步骤 2：将策略附加到用户

1. 在 IAM 控制台左侧菜单，点击 **"用户"**（Users）
2. 找到你的用户，点击用户名
3. 点击 **"权限"**（Permissions）标签
4. 点击 **"添加权限"**（Add permissions）
5. 选择 **"直接附加现有策略"**（Attach policies directly）
6. 在搜索框中输入你刚才创建的策略名称（例如：`S3ListBucketPolicy`）
7. 勾选策略
8. 点击 **"下一步"** → **"添加权限"**

---

## 🎯 推荐方案

### 如果你需要完整的 S3 功能（上传、下载、删除等）

**推荐使用方法 A**：附加 `AmazonS3FullAccess` 策略

- ✅ 简单快速
- ✅ 包含所有 S3 权限
- ✅ 适合大多数场景

### 如果你只需要列表权限（最小权限原则）

**使用方法 B**：创建自定义策略，只添加 `s3:ListBucket`

- ✅ 遵循最小权限原则
- ✅ 更安全
- ⚠️ 但如果你还需要上传文件，还需要添加 `s3:PutObject` 权限

---

## 🔍 如何确认权限已生效

### 方法 1：在 IAM 控制台查看

1. 进入 IAM 用户详情页
2. 点击 **"权限"** 标签
3. 确认策略已出现在列表中

### 方法 2：使用诊断工具测试

1. 等待 1-2 分钟让权限生效
2. 在前端管理后台，点击 **"测试 AWS 配置"** 按钮
3. 查看 **"存储桶访问测试"** 是否显示 ✅

### 方法 3：使用 AWS CLI 测试

如果安装了 AWS CLI：

```bash
# 配置 AWS CLI（使用你的访问密钥）
aws configure

# 测试列出存储桶
aws s3 ls s3://你的存储桶名称/

# 如果成功，说明权限正常
```

---

## 📝 常见问题

### Q1：我找不到搜索框在哪里？

**A**：搜索框通常在 AWS 控制台**顶部中间**位置，显示为：
- 一个搜索图标（🔍）
- 或者显示 "搜索服务、功能..." 的文本输入框

如果还是找不到，可以：
- 直接访问：https://console.aws.amazon.com/iam/
- 或者点击左上角的 **"☰"** 菜单，找到 **"安全、身份与合规"** → **"IAM"**

### Q2：我点击了 IAM，但显示"访问被拒绝"？

**A**：这说明你当前登录的 AWS 账号没有 IAM 访问权限。可能的原因：
- 你使用的是 IAM 用户账号，而不是根账号
- 你的 IAM 用户没有 IAM 管理权限

**解决方案**：
- 使用 AWS 根账号登录（创建 AWS 账号时使用的邮箱和密码）
- 或者联系有 IAM 管理权限的账号管理员

### Q3：添加权限后，仍然显示错误？

**A**：可能的原因：
1. **权限生效延迟**：等待 1-2 分钟
2. **存储桶策略限制**：检查 S3 存储桶的存储桶策略
3. **区域不匹配**：确认后端环境变量 `AWS_REGION` 与存储桶区域一致

### Q4：我应该使用哪个方法？

**A**：
- **如果你不确定**：使用方法 A（附加 `AmazonS3FullAccess`），这是最简单的方法
- **如果你需要最小权限**：使用方法 B（创建自定义策略），但需要确保包含所有需要的权限

---

## ✅ 总结

1. **找到 IAM 控制台**：
   - 方法 1：在 AWS 控制台顶部搜索框输入 `IAM`
   - 方法 2：直接访问 https://console.aws.amazon.com/iam/
   - 方法 3：通过服务菜单 → "安全、身份与合规" → "IAM"

2. **添加 s3:ListBucket 权限**：
   - **推荐**：附加 `AmazonS3FullAccess` 策略（方法 A）
   - **或者**：创建自定义策略，只添加 `s3:ListBucket`（方法 B）

3. **验证权限**：
   - 在 IAM 控制台确认策略已附加
   - 等待 1-2 分钟让权限生效
   - 使用诊断工具测试

---

## 🎯 下一步

1. 按照上述步骤找到 IAM 控制台
2. 找到你的 IAM 用户（例如：`xiaogao-uploader`）
3. 附加 `AmazonS3FullAccess` 策略（或创建自定义策略）
4. 等待 1-2 分钟
5. 使用诊断工具测试权限是否生效

