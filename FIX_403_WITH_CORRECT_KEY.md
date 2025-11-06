# 🔧 修复 403 错误：确认使用正确的访问密钥

## 📋 问题分析

从你的 IAM 用户详情页可以看到：
- ✅ `AmazonS3FullAccess` 策略已正确附加
- ⚠️ **访问密钥 1** (`AKIARLX2YLLCAHMIY24P`) 显示：**"从未使用, 今天已创建"**

这说明：**后端可能在使用旧的访问密钥，而不是这个新创建的密钥！**

---

## 🔍 排查步骤

### 步骤 1：确认后端使用的访问密钥

#### 如果使用 Railway 部署：

1. 登录 Railway：https://railway.app
2. 选择你的后端服务
3. 进入 **"Variables"**（变量）标签页
4. 查看以下环境变量：
   - `AWS_ACCESS_KEY_ID` - **记录这个值**
   - `AWS_SECRET_ACCESS_KEY` - 不显示完整值，但可以检查
   - `AWS_REGION` - 确认区域
   - `AWS_S3_BUCKET` - 确认存储桶名称

5. **对比访问密钥**：
   - 如果 `AWS_ACCESS_KEY_ID` **不等于** `AKIARLX2YLLCAHMIY24P`，说明后端在使用旧的密钥
   - 需要更新为新的访问密钥

#### 如果使用本地开发：

1. 打开 `backend/.env` 文件
2. 查看 `AWS_ACCESS_KEY_ID` 的值
3. **对比访问密钥**：
   - 如果 `AWS_ACCESS_KEY_ID` **不等于** `AKIARLX2YLLCAHMIY24P`，说明后端在使用旧的密钥

---

### 步骤 2：更新访问密钥

#### 方法 A：使用新创建的访问密钥（推荐）

**从 IAM 用户详情页获取**：
1. 访问密钥 ID：`AKIARLX2YLLCAHMIY24P`（已显示）
2. 秘密访问密钥：需要点击 **"显示"**（Show）按钮查看

⚠️ **注意**：如果秘密访问密钥没有保存，需要创建新的访问密钥。

#### 方法 B：创建新的访问密钥

如果无法查看秘密访问密钥，需要创建新的：

1. 在 IAM 用户详情页，点击 **"安全凭证"**（Security credentials）标签
2. 找到 **"访问密钥"**（Access keys）部分
3. 点击 **"创建访问密钥"**（Create access key）
4. 选择使用场景：**"应用程序在 AWS 外部运行"**（Application running outside AWS）
5. 点击 **"下一步"** → **"创建访问密钥"**
6. **立即保存**：
   - **访问密钥 ID**（例如：`AKIARLX2YLLCAHMIY24P`）
   - **秘密访问密钥**（只显示一次！）

---

### 步骤 3：更新后端环境变量

#### 如果使用 Railway：

1. 在 Railway 后端服务的 **"Variables"** 标签页
2. 找到 `AWS_ACCESS_KEY_ID`，点击编辑
3. 更新为新的访问密钥 ID：`AKIARLX2YLLCAHMIY24P`
4. 找到 `AWS_SECRET_ACCESS_KEY`，点击编辑
5. 更新为新的秘密访问密钥
6. **同时检查并更新**：
   - `AWS_REGION` - 确认是存储桶所在区域（例如：`us-east-2`）
   - `AWS_S3_BUCKET` - 确认是存储桶名称（例如：`xiaohongshu-images-xiaogao`）
7. **保存更改**
8. **触发重新部署**：
   - Railway 会自动检测环境变量更改并重新部署
   - 或者手动点击 **"Deploy"**（部署）按钮

#### 如果使用本地开发：

1. 打开 `backend/.env` 文件
2. 更新以下配置：

```env
# AWS S3 配置
AWS_ACCESS_KEY_ID="AKIARLX2YLLCAHMIY24P"
AWS_SECRET_ACCESS_KEY="你的新秘密访问密钥"
AWS_REGION="us-east-2"  # 确认这是你的存储桶所在区域
AWS_S3_BUCKET="你的存储桶名称"  # 例如：xiaohongshu-images-xiaogao
```

3. **保存文件**
4. **重启后端服务**：

   **方式 A：如果使用 Docker Compose（推荐）**
   ```bash
   # 重启后端容器
   docker-compose -f docker-compose.dev.yml restart backend
   
   # 或者先停止再启动
   docker-compose -f docker-compose.dev.yml stop backend
   docker-compose -f docker-compose.dev.yml up -d backend
   
   # 查看日志确认重启成功
   docker-compose -f docker-compose.dev.yml logs -f backend
   ```

   **方式 B：如果直接在本地运行（不使用 Docker）**
   ```bash
   # 1. 停止当前运行的后端
   #    在运行后端的终端窗口按 Ctrl+C
   
   # 2. 进入后端目录
   cd backend
   
   # 3. 重新启动
   npm run start:dev
   ```

---

### 步骤 4：验证配置

#### 检查环境变量是否正确加载

**如果使用 Railway**：
1. 在 Railway 后端服务，进入 **"Deployments"**（部署）标签
2. 查看最新的部署日志
3. **不应该看到**这个警告：
   ```
   警告: AWS S3 环境变量未配置，图片上传功能将使用 Base64 编码（临时方案）
   ```

**如果使用本地开发**：
1. 启动后端服务
2. 查看控制台输出
3. **不应该看到**这个警告

#### 检查访问密钥是否被使用

1. 等待 1-2 分钟（让配置生效）
2. 在 AWS IAM 控制台，刷新 `xiaogao-uploader` 用户详情页
3. 查看 **"访问密钥 1"** 状态：
   - ✅ 如果显示 **"已使用"**（Used），说明后端正在使用这个密钥
   - ⚠️ 如果仍然显示 **"从未使用"**，说明后端可能还没有使用新密钥

---

### 步骤 5：测试上传

1. **清除浏览器缓存**：
   - 按 `Ctrl+Shift+Delete` 清除缓存
   - 或按 `Ctrl+Shift+R` 硬刷新页面

2. **打开浏览器开发者工具**（F12）
   - 切换到 **"控制台"**（Console）标签
   - 切换到 **"网络"**（Network）标签

3. **尝试上传图片**

4. **检查结果**：
   - ✅ **成功**：不再出现 403 错误，图片上传成功
   - ❌ **仍然 403**：继续排查（见下方）

---

## 🔍 如果仍然出现 403 错误

### 检查清单

请逐一确认以下所有项：

- [ ] **访问密钥匹配**：后端 `AWS_ACCESS_KEY_ID` 等于 `AKIARLX2YLLCAHMIY24P`
- [ ] **秘密访问密钥正确**：后端 `AWS_SECRET_ACCESS_KEY` 是正确的秘密访问密钥
- [ ] **区域匹配**：后端 `AWS_REGION` 与存储桶所在区域一致
  - 在 S3 控制台查看存储桶列表，确认存储桶的 **"区域"**（Region）列
  - 常见区域：`us-east-1`, `us-east-2`, `ap-northeast-1`
- [ ] **存储桶名称匹配**：后端 `AWS_S3_BUCKET` 与存储桶名称完全一致（区分大小写）
- [ ] **IAM 用户权限**：`xiaogao-uploader` 用户已附加 `AmazonS3FullAccess` 策略（✅ 已确认）
- [ ] **后端已重新部署/重启**：修改环境变量后，后端服务已重新启动
- [ ] **等待时间**：修改后等待了 1-2 分钟让配置生效

### 验证存储桶区域和名称

1. 登录 AWS 控制台：https://console.aws.amazon.com/
2. 进入 S3 服务
3. 查看存储桶列表，记录：
   - **存储桶名称**（例如：`xiaohongshu-images-xiaogao`）
   - **区域**（例如：`us-east-2`）
4. 对比后端环境变量，确保完全一致

### 测试访问密钥权限

如果仍然不确定，可以创建一个测试脚本验证访问密钥：

1. 在本地创建测试文件 `test-aws-key.js`：

```javascript
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: 'AKIARLX2YLLCAHMIY24P',  // 替换为你的访问密钥 ID
  secretAccessKey: '你的秘密访问密钥',  // 替换为你的秘密访问密钥
  region: 'us-east-2',  // 替换为你的区域
});

const bucket = '你的存储桶名称';  // 替换为你的存储桶名称

// 测试生成预签名 URL
const params = {
  Bucket: bucket,
  Key: 'test-upload.txt',
  ContentType: 'text/plain',
  Expires: 300,
};

s3.getSignedUrlPromise('putObject', params)
  .then(url => {
    console.log('✅ 成功生成预签名 URL:');
    console.log(url);
  })
  .catch(error => {
    console.error('❌ 生成预签名 URL 失败:');
    console.error(error.message);
    if (error.code === 'AccessDenied') {
      console.error('提示：访问被拒绝，可能是权限不足');
    }
  });
```

2. 运行测试：
```bash
cd backend
node test-aws-key.js
```

3. **结果判断**：
   - ✅ 如果成功生成 URL，说明访问密钥有权限
   - ❌ 如果报错 `AccessDenied`，说明访问密钥权限不足

---

## 📝 常见错误原因

### 错误 1：使用了错误的访问密钥

**症状**：访问密钥显示"从未使用"，但后端报 403 错误

**原因**：后端环境变量使用的是另一个 IAM 用户的访问密钥（可能没有权限）

**解决**：更新后端环境变量为正确的访问密钥

### 错误 2：区域不匹配

**症状**：访问密钥有权限，但仍然 403

**原因**：后端 `AWS_REGION` 与存储桶所在区域不一致

**解决**：在 S3 控制台查看存储桶区域，更新后端 `AWS_REGION` 环境变量

### 错误 3：存储桶名称不匹配

**症状**：访问密钥有权限，但仍然 403

**原因**：后端 `AWS_S3_BUCKET` 与存储桶名称不一致（大小写敏感）

**解决**：在 S3 控制台查看存储桶名称，确保完全一致

### 错误 4：后端未重启

**症状**：更新环境变量后仍然 403

**原因**：后端服务没有重新加载环境变量

**解决**：
- Railway：等待自动重新部署，或手动触发部署
- 本地开发：停止并重新启动后端服务

---

## 🎉 完成！

修复完成后：
- ✅ 后端使用正确的访问密钥（`AKIARLX2YLLCAHMIY24P`）
- ✅ 访问密钥状态显示"已使用"
- ✅ 前端可以正常上传图片到 S3
- ✅ 不再出现 403 Forbidden 错误

---

## 📚 相关文档

- `FIX_S3_403_ERROR.md` - 403 错误通用修复指南
- `AWS_S3_DEPLOYMENT_GUIDE.md` - S3 完整部署指南
- `AWS_S3_QUICK_START.md` - S3 快速开始指南

---

**最后更新**：2025-01-27

