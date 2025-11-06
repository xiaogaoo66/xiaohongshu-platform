# 🔧 修复 InvalidAccessKeyId 错误

## 📋 错误说明

当你看到以下错误时：
```
InvalidAccessKeyId: The AWS Access Key Id you provided does not exist in our records.
```

这意味着：
- ❌ AWS Access Key ID 不存在或已被删除
- ❌ 可能使用了错误的 Access Key ID
- ❌ Access Key 可能已过期

---

## 🔍 快速诊断

### 方法 1：使用诊断端点

访问后端诊断端点：
```
https://你的后端域名/api/upload/diagnose
```

如果看到 `InvalidAccessKeyId` 错误，诊断工具会显示：
- 当前使用的 Access Key ID 前缀
- 详细的修复步骤

### 方法 2：检查 Railway 环境变量

1. 登录 Railway：https://railway.app
2. 选择你的后端服务
3. 进入 **"Variables"**（变量）标签页
4. 查看 `AWS_ACCESS_KEY_ID` 的值
5. 对比 AWS IAM 控制台中的 Access Key ID

---

## ✅ 解决步骤

### 步骤 1：在 AWS IAM 中创建新的访问密钥

1. **登录 AWS IAM 控制台**
   - 访问：https://console.aws.amazon.com/iam/
   - 或通过 AWS 控制台 → IAM

2. **选择 IAM 用户**
   - 找到你的 IAM 用户（例如：`xiaohongshu-s3-user`）
   - 点击用户名进入详情页

3. **进入安全凭证标签**
   - 点击 **"安全凭证"**（Security credentials）标签
   - 滚动到 **"访问密钥"**（Access keys）部分

4. **创建新的访问密钥**
   - 点击 **"创建访问密钥"**（Create access key）按钮
   - 选择使用场景：**"应用程序在 AWS 外部运行"**（Application running outside AWS）
   - 点击 **"下一步"**（Next）
   - 添加描述（可选）：`Railway Backend - S3 Upload`
   - 点击 **"创建访问密钥"**（Create access key）

5. **保存访问密钥**
   - ⚠️ **重要**：立即复制并保存以下信息：
     - **访问密钥 ID**（Access Key ID）：例如 `AKIARLX2YLLCAHMIY24P`
     - **秘密访问密钥**（Secret Access Key）：例如 `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
   - ⚠️ **注意**：秘密访问密钥只显示一次，关闭页面后无法再次查看
   - 如果丢失，需要删除并重新创建访问密钥

---

### 步骤 2：在 Railway 中更新环境变量

1. **登录 Railway**
   - 访问：https://railway.app
   - 使用你的 GitHub 账号登录

2. **选择后端服务**
   - 在项目列表中找到你的后端服务
   - 点击进入服务详情页

3. **进入变量设置**
   - 点击 **"Variables"**（变量）标签页
   - 或点击服务设置 → 环境变量

4. **更新 AWS 凭证**
   - 找到 `AWS_ACCESS_KEY_ID` 变量
     - 点击编辑（或删除后重新添加）
     - 输入新的 Access Key ID
     - 保存
   - 找到 `AWS_SECRET_ACCESS_KEY` 变量
     - 点击编辑（或删除后重新添加）
     - 输入新的 Secret Access Key
     - 保存

5. **确认其他环境变量**
   确保以下变量都已正确配置：
   - `AWS_ACCESS_KEY_ID` = 新的 Access Key ID
   - `AWS_SECRET_ACCESS_KEY` = 新的 Secret Access Key
   - `AWS_REGION` = `us-east-2`（或你的存储桶区域）
   - `AWS_S3_BUCKET` = `xiaohongshu-images-xiaogao`（或你的存储桶名称）

6. **等待重新部署**
   - Railway 会自动检测环境变量变化
   - 通常在 1-2 分钟内完成重新部署
   - 可以在 **"Deployments"** 标签页查看部署状态

---

### 步骤 3：验证修复

1. **等待部署完成**
   - 在 Railway 的 **"Deployments"** 标签页查看部署状态
   - 等待状态变为 **"Success"**

2. **测试诊断端点**
   - 访问：`https://你的后端域名/api/upload/diagnose`
   - 应该看到：
     - ✅ `bucketAccess: ✅ 可以访问存储桶`
     - ✅ `presignedUrlTest: ✅ 可以生成预签名 URL`
     - 没有 `InvalidAccessKeyId` 错误

3. **测试上传功能**
   - 在前端尝试上传一张图片
   - 应该成功上传，不再出现 403 错误

---

## 🔒 安全建议

### 1. 定期轮换访问密钥

- 建议每 90 天轮换一次访问密钥
- 创建新密钥后，更新所有使用该密钥的服务
- 删除旧的访问密钥

### 2. 使用最小权限原则

- 只授予 IAM 用户必要的 S3 权限
- 不要使用 `AdministratorAccess` 策略
- 推荐使用 `AmazonS3FullAccess` 或自定义策略

### 3. 保护访问密钥

- ⚠️ **永远不要**将访问密钥提交到 Git 仓库
- ⚠️ **永远不要**在前端代码中暴露访问密钥
- ✅ 只在后端环境变量中存储访问密钥
- ✅ 使用 `.env` 文件（本地开发）或环境变量（生产环境）

---

## 🆘 常见问题

### Q1: 我忘记了 Secret Access Key，怎么办？

**A:** 如果忘记了 Secret Access Key，无法恢复，必须创建新的访问密钥：
1. 在 AWS IAM 控制台中删除旧的访问密钥
2. 创建新的访问密钥
3. 在 Railway 中更新环境变量

### Q2: 我可以有多个访问密钥吗？

**A:** 每个 IAM 用户最多可以有 2 个访问密钥。你可以：
- 保留一个作为备用
- 在轮换时，先创建新密钥，更新服务后，再删除旧密钥

### Q3: 更新环境变量后，需要重启服务吗？

**A:** Railway 会自动检测环境变量变化并重新部署，无需手动重启。

### Q4: 如何确认当前使用的是哪个 Access Key ID？

**A:** 访问诊断端点：`https://你的后端域名/api/upload/diagnose`
- 查看 `config.accessKeyIdPrefix` 字段
- 对比 AWS IAM 控制台中的 Access Key ID

---

## 📚 相关文档

- [AWS IAM 用户指南](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [Railway 环境变量文档](https://docs.railway.app/develop/variables)
- [S3 上传故障排查指南](./S3_UPLOAD_TROUBLESHOOTING.md)

---

## ✅ 检查清单

在修复后，确认以下项目：

- [ ] 在 AWS IAM 中创建了新的访问密钥
- [ ] 保存了 Access Key ID 和 Secret Access Key
- [ ] 在 Railway 中更新了 `AWS_ACCESS_KEY_ID`
- [ ] 在 Railway 中更新了 `AWS_SECRET_ACCESS_KEY`
- [ ] Railway 部署成功（状态为 "Success"）
- [ ] 诊断端点显示配置正常
- [ ] 前端上传功能正常工作

---

**最后更新：** 2025-11-06

