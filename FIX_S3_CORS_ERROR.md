# 🔧 修复 S3 CORS 错误

## 📋 问题描述

**错误信息**：
```
Access to fetch at 'https://xiaohongshu-images-xiaogao.s3.us-east-2.amazonaws.com/...' 
from origin 'https://xiaohongshu-platform.vercel.app' 
has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**原因**：
- 前端从 Vercel 域名直接上传文件到 S3
- S3 bucket 没有配置 CORS 策略来允许来自 Vercel 的请求
- 浏览器阻止了跨域请求

---

## ✅ 解决方案：配置 S3 CORS 策略

### 步骤 1：登录 AWS 控制台

1. 访问：https://console.aws.amazon.com/
2. 登录你的 AWS 账号

### 步骤 2：进入 S3 控制台

1. 在顶部搜索栏输入 **"S3"**
2. 点击 **"S3"** 服务

### 步骤 3：选择你的存储桶

1. 在存储桶列表中，找到你的存储桶（例如：`xiaohongshu-images-xiaogao`）
2. 点击存储桶名称进入详情页

### 步骤 4：配置 CORS 策略

1. 在存储桶详情页，点击 **"权限"**（Permissions）标签页
2. 向下滚动，找到 **"跨源资源共享 (CORS)"**（Cross-origin resource sharing (CORS)）部分
3. 点击 **"编辑"**（Edit）按钮

### 步骤 5：添加 CORS 配置

在编辑框中，粘贴以下 JSON 配置：

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
            "https://xiaohongshu-platform.vercel.app",
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

**配置说明**：

- **AllowedOrigins**：允许的来源域名
  - `https://xiaohongshu-platform.vercel.app` - 你的 Vercel 前端域名
  - `http://localhost:5173` - 本地开发环境（Vite 默认端口）
  - `http://localhost:3000` - 本地开发环境（备用端口）
  
  **如果需要添加更多域名**，在数组中添加即可：
  ```json
  "AllowedOrigins": [
      "https://xiaohongshu-platform.vercel.app",
      "https://your-other-domain.com",
      "http://localhost:5173"
  ]
  ```

- **AllowedMethods**：允许的 HTTP 方法
  - `PUT` - 用于上传文件（必需）
  - `GET` - 用于读取文件
  - `POST` - 用于某些上传场景
  - `DELETE` - 用于删除文件
  - `HEAD` - 用于检查文件是否存在

- **AllowedHeaders**：允许的请求头
  - `*` - 允许所有请求头（推荐）

- **ExposeHeaders**：暴露给前端的响应头
  - `ETag` - 文件唯一标识
  - `x-amz-request-id` - 请求 ID（用于调试）

- **MaxAgeSeconds**：预检请求缓存时间（秒）
  - `3600` - 1 小时（推荐）

### 步骤 6：保存配置

1. 检查配置无误后，点击 **"保存更改"**（Save changes）
2. 等待几秒钟让配置生效

---

## 🧪 验证修复

### 方法 1：浏览器测试

1. 访问你的前端管理后台：`https://xiaohongshu-platform.vercel.app`
2. 打开浏览器开发者工具（F12）
3. 切换到 **"控制台"**（Console）标签
4. 尝试上传一张图片
5. **应该不再出现 CORS 错误**

### 方法 2：检查网络请求

1. 在开发者工具中，切换到 **"网络"**（Network）标签
2. 尝试上传图片
3. 找到对 S3 的 PUT 请求（URL 包含 `.s3.` 和 `.amazonaws.com`）
4. 点击该请求，查看响应头：
   - ✅ 应该看到 `Access-Control-Allow-Origin: https://xiaohongshu-platform.vercel.app`
   - ✅ 状态码应该是 `200 OK`

---

## 🔍 故障排查

### 问题 1：配置保存后仍然报错

**可能原因**：
- CORS 配置需要几分钟才能完全生效
- 浏览器缓存了旧的 CORS 响应

**解决方案**：
1. 等待 2-3 分钟
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 硬刷新页面（Ctrl+Shift+R）
4. 重新尝试上传

### 问题 2：仍然显示 CORS 错误

**检查清单**：
- ✅ 确认 CORS 配置已保存
- ✅ 确认 `AllowedOrigins` 中包含你的前端域名（**完全匹配**，包括协议 `https://`）
- ✅ 确认 `AllowedMethods` 中包含 `PUT`
- ✅ 确认存储桶区域正确（`us-east-2`）

**调试步骤**：
1. 在浏览器开发者工具的 Network 标签中
2. 找到失败的请求
3. 查看请求的 `Origin` 头（应该与 `AllowedOrigins` 中的某个值完全匹配）
4. 查看响应头，确认是否有 `Access-Control-Allow-Origin`

### 问题 3：预检请求（OPTIONS）失败

**症状**：
- 控制台显示 OPTIONS 请求失败
- 错误信息：`CORS preflight request failed`

**解决方案**：
- 确认 `AllowedMethods` 中包含所有需要的方法
- 确认 `AllowedHeaders` 设置为 `["*"]`
- 确认 `MaxAgeSeconds` 已设置（不能为 0 或空）

### 问题 4：多个前端域名

如果你有多个前端域名（例如：开发环境、生产环境），在 `AllowedOrigins` 数组中添加所有域名：

```json
"AllowedOrigins": [
    "https://xiaohongshu-platform.vercel.app",
    "https://your-production-domain.com",
    "http://localhost:5173",
    "http://localhost:3000"
]
```

---

## 📝 完整 CORS 配置示例（生产环境）

如果你需要更严格的配置（只允许特定域名），可以使用：

```json
[
    {
        "AllowedHeaders": [
            "Content-Type",
            "Content-MD5",
            "x-amz-content-sha256",
            "x-amz-date",
            "Authorization"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "https://xiaohongshu-platform.vercel.app"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

---

## 🎉 完成！

配置完成后：
- ✅ 前端可以正常上传图片到 S3
- ✅ 不再出现 CORS 错误
- ✅ 图片上传速度更快（直接上传到 S3，不经过后端）

---

## 📚 相关文档

- `AWS_S3_DEPLOYMENT_GUIDE.md` - S3 完整部署指南
- `AWS_S3_QUICK_START.md` - S3 快速开始指南

---

**最后更新**：2025-01-27

