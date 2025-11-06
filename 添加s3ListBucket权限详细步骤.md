# 📝 为 IAM 用户添加 s3:ListBucket 权限 - 详细步骤

## 🎯 目标

为你的 IAM 用户添加 `s3:ListBucket` 权限，使诊断工具能够成功执行 `headBucket` 操作。

---

## 📋 方法一：创建自定义策略（推荐）

这种方法可以精确控制权限，只授予必要的操作。

### 步骤 1：登录 AWS 控制台

1. 访问：https://console.aws.amazon.com/
2. 登录你的 AWS 账号

### 步骤 2：进入 IAM 控制台

1. 在顶部搜索栏输入 **"IAM"**
2. 点击 **"IAM"** 服务（或直接访问：https://console.aws.amazon.com/iam/）

### 步骤 3：创建自定义策略

1. 在左侧菜单，点击 **"策略"**（Policies）
2. 点击右上角的 **"创建策略"**（Create policy）按钮

### 步骤 4：切换到 JSON 编辑器

1. 在策略创建页面，点击 **"JSON"** 标签页
2. 删除默认内容，粘贴以下策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
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

**重要**：
- 将 `xiaohongshu-images-xiaogao` 替换为你的实际存储桶名称
- `s3:ListBucket` 权限的 Resource 必须是存储桶 ARN（**不包含 `/*`**）

### 步骤 5：添加其他必要权限（可选但推荐）

如果你想要一个完整的策略，包含所有后端需要的权限，使用以下策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:HeadBucket"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao"
    },
    {
      "Sid": "AllowObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

**说明**：
- 第一个 Statement：存储桶级别操作（`ListBucket`、`HeadBucket`）
- 第二个 Statement：对象级别操作（`PutObject`、`GetObject`、`DeleteObject`）
- 注意 Resource 的区别：存储桶级别**没有** `/*`，对象级别**有** `/*`

### 步骤 6：验证策略

1. 点击 **"下一步"** 按钮
2. 系统会自动验证策略语法
3. 如果显示 **"策略验证成功"**，继续下一步
4. 如果有错误，检查 JSON 格式是否正确

### 步骤 7：命名策略

1. 在 **"策略名称"** 输入框中输入：`S3ListBucketPolicy`（或任何你喜欢的名字）
2. 在 **"描述"** 输入框中输入：`允许列出存储桶中的对象`（可选）
3. 点击 **"创建策略"** 按钮

---

## 📋 方法二：附加策略到 IAM 用户

### 步骤 1：找到你的 IAM 用户

1. 在 IAM 控制台左侧菜单，点击 **"用户"**（Users）
2. 找到你的 IAM 用户（例如：`xiaohongshu-uploader`）
3. 点击用户名进入详情页

### 步骤 2：添加权限

1. 在用户详情页，点击 **"权限"**（Permissions）标签页
2. 点击 **"添加权限"**（Add permissions）按钮

### 步骤 3：选择附加方式

1. 选择 **"直接附加现有策略"**（Attach policies directly）
2. 在搜索框中输入你刚创建的策略名称（例如：`S3ListBucketPolicy`）
3. 或者搜索 `ListBucket` 找到相关策略
4. 勾选你创建的策略
5. 点击 **"下一步"** 按钮

### 步骤 4：确认并添加

1. 检查策略列表，确认已选中你的策略
2. 点击 **"添加权限"** 按钮
3. 等待页面刷新，你应该能看到策略已附加到用户

---

## 📋 方法三：如果已有 AmazonS3FullAccess 策略

**注意**：`AmazonS3FullAccess` 策略**已经包含** `s3:ListBucket` 权限。

如果你已经附加了 `AmazonS3FullAccess` 但仍然无法访问存储桶，问题可能不在权限，而在：

1. **存储桶策略**中有 Deny 规则
2. **区域不匹配**
3. **存储桶名称不匹配**

请参考 `已添加AmazonS3FullAccess但仍失败排查.md` 进行排查。

---

## ✅ 验证权限是否生效

### 方法 1：使用诊断脚本

1. 等待 1-2 分钟让权限生效
2. 运行诊断脚本：

```bash
node scripts/diagnose-s3-access.js
```

3. 检查输出，应该显示：
   - ✅ **可以访问存储桶（headBucket 成功）**
   - ✅ **可以列出存储桶中的对象**

### 方法 2：在 AWS 控制台验证

1. 在 IAM 用户详情页，点击 **"权限"** 标签页
2. 找到你附加的策略
3. 点击策略名称，查看策略详情
4. 确认策略中包含 `s3:ListBucket` 权限

---

## 🔍 权限说明

### s3:ListBucket 的作用

- 允许列出存储桶中的对象（相当于 `ls` 命令）
- 诊断工具使用 `headBucket` 操作需要此权限
- 某些管理操作也需要此权限

### 与其他权限的区别

| 权限 | Resource 格式 | 作用 |
|------|--------------|------|
| `s3:ListBucket` | `arn:aws:s3:::bucket-name` | 列出存储桶中的对象 |
| `s3:HeadBucket` | `arn:aws:s3:::bucket-name` | 检查存储桶是否存在 |
| `s3:PutObject` | `arn:aws:s3:::bucket-name/*` | 上传对象 |
| `s3:GetObject` | `arn:aws:s3:::bucket-name/*` | 下载对象 |
| `s3:DeleteObject` | `arn:aws:s3:::bucket-name/*` | 删除对象 |

**重要**：
- 存储桶级别权限（`ListBucket`、`HeadBucket`）的 Resource **不包含** `/*`
- 对象级别权限（`PutObject`、`GetObject`、`DeleteObject`）的 Resource **必须包含** `/*`

---

## 🎯 推荐的完整策略

如果你想要一个包含所有必要权限的策略，使用以下内容：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBucketOperations",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:HeadBucket"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao"
    },
    {
      "Sid": "AllowObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::xiaohongshu-images-xiaogao/*"
    }
  ]
}
```

**替换存储桶名称**：将 `xiaohongshu-images-xiaogao` 替换为你的实际存储桶名称。

---

## ⚠️ 常见问题

### 问题 1：策略创建后仍然无法访问

**可能原因**：
- 权限需要 1-2 分钟才能生效
- 策略的 Resource 格式错误（存储桶级别权限不能有 `/*`）
- 存储桶名称不匹配

**解决方法**：
- 等待 1-2 分钟后重试
- 检查策略 JSON 格式是否正确
- 确认存储桶名称与策略中的 Resource 一致

### 问题 2：不知道存储桶名称

**解决方法**：
1. 访问 S3 控制台：https://console.aws.amazon.com/s3/
2. 查看存储桶列表，找到你的存储桶
3. 复制存储桶名称，替换策略中的 `xiaohongshu-images-xiaogao`

### 问题 3：策略验证失败

**可能原因**：
- JSON 格式错误（缺少逗号、引号等）
- Resource ARN 格式错误

**解决方法**：
- 仔细检查 JSON 语法
- 确保 Resource 格式为：`arn:aws:s3:::bucket-name`（存储桶级别）或 `arn:aws:s3:::bucket-name/*`（对象级别）

---

## 📖 相关文档

- `已添加AmazonS3FullAccess但仍失败排查.md` - 完整排查指南
- `存储桶策略分析结果.md` - 存储桶策略分析
- `scripts/diagnose-s3-access.js` - 诊断工具

---

## 🎉 完成！

添加权限后，运行诊断脚本验证：

```bash
node scripts/diagnose-s3-access.js
```

如果显示 **"✅ 可以访问存储桶"**，说明权限已成功添加！

