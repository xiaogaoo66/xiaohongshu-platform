# 🔧 OSS CORS 403 错误修复指南

## 📋 问题描述

在阿里云 OSS 控制台的 CORS 配置界面中，**没有 OPTIONS 方法的选项可以勾选**，但浏览器在发送 PUT 请求前会先发送 OPTIONS 预检请求。如果 CORS 规则中没有 OPTIONS 方法，预检请求会失败，导致 403 错误。

## ✅ 解决方案（3 种方法）

---

## 方案 1：使用 ossutil 命令行工具添加 OPTIONS（推荐）

这是**最直接、最可靠**的解决方案。即使控制台界面没有 OPTIONS 选项，也可以通过命令行工具配置。

### 步骤 1：下载 ossutil

1. 访问阿里云官方文档：https://help.aliyun.com/document_detail/120075.html
2. 下载适合您操作系统的 ossutil（Windows/Mac/Linux）
3. 解压到本地目录

### 步骤 2：配置 ossutil

在命令行中运行：

```bash
# Windows PowerShell
.\ossutil.exe config

# Mac/Linux
./ossutil config
```

按提示输入：
- **Endpoint**: `oss-cn-chengdu.aliyuncs.com`
- **AccessKeyId**: 您的 AccessKey ID
- **AccessKeySecret**: 您的 AccessKey Secret

### 步骤 3：创建 CORS 配置文件

在项目根目录创建 `cors-config.xml` 文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>OPTIONS</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-oss-request-id</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

### 步骤 4：应用 CORS 配置

```bash
# Windows PowerShell
.\ossutil.exe cors --method put oss://xhs-content cors-config.xml

# Mac/Linux
./ossutil cors --method put oss://xhs-content cors-config.xml
```

如果成功，您会看到类似输出：
```
0.299514(s) elapsed
```

### 步骤 5：验证配置

运行诊断脚本验证：

```bash
node scripts/deep-diagnose-oss.cjs
```

应该看到 "CORS 预检请求" 测试通过。

---

## 方案 2：修改为 POST 方法上传（避免预检请求）

如果不想使用命令行工具，可以修改代码使用 POST 方法。POST 方法在某些情况下可能不需要预检请求（取决于请求头）。

### 2.1 修改后端代码

修改 `backend/src/upload/upload.service.ts`：

```typescript
// 将 method 从 'PUT' 改为 'POST'
const signatureOptions: OSS.SignatureUrlOptions = {
  method: 'POST',  // 改为 POST
  expires: 300,
};
```

### 2.2 修改前端代码

修改 `frontend/src/pages/AdminDashboard.tsx`：

```typescript
// 将 method 从 'PUT' 改为 'POST'
const uploadResponse = await fetch(presignedUrl, {
  method: 'POST',  // 改为 POST
  body: file,
  headers: requestHeaders,
  credentials: 'omit',
});
```

**⚠️ 注意**：POST 方法在某些情况下仍可能触发预检请求（如果设置了自定义 Content-Type）。如果仍然失败，请使用方案 1。

---

## 方案 3：使用阿里云 OSS POST 表单上传

这是另一种上传方式，使用表单 POST 请求，通常不需要预检请求。

### 3.1 修改后端生成 POST 表单签名

修改 `backend/src/upload/upload.service.ts`，添加新方法：

```typescript
async generatePostPresignedUrl(filename: string, contentType: string) {
  if (!this.ossClient || !this.bucket) {
    return {
      presignedUrl: null,
      key: null,
      url: null,
      useBase64: true,
      message: '请先配置阿里云 OSS 的 AccessKey、Region、Bucket',
    };
  }

  const key = `uploads/${uuidv4()}-${filename}`;
  const normalizedContentType = contentType && contentType !== 'undefined' 
    ? contentType.split(';')[0].trim() 
    : 'application/octet-stream';

  try {
    // 生成 POST 表单上传的签名
    const policy = this.ossClient.calculatePostSignature({
      expiration: new Date(Date.now() + 300 * 1000).toISOString(),
      conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024], // 最大 10MB
        ['eq', '$key', key],
        ['eq', '$Content-Type', normalizedContentType],
      ],
    });

    const formData = {
      key,
      policy: policy.policy,
      OSSAccessKeyId: this.ossClient.options.accessKeyId,
      signature: policy.signature,
      'Content-Type': normalizedContentType,
    };

    return {
      formData,
      action: `https://${this.bucket}.${this.region}.aliyuncs.com`,
      key,
      url: this.buildPublicUrl(key),
      expectedContentType: normalizedContentType,
    };
  } catch (error: any) {
    console.error('❌ 生成 POST 表单签名失败', error);
    throw new Error(`生成 POST 表单签名失败：${error?.message || error}`);
  }
}
```

### 3.2 修改前端使用表单上传

修改 `frontend/src/pages/AdminDashboard.tsx`：

```typescript
// 使用 FormData 上传
const formData = new FormData();
formData.append('key', result.key);
formData.append('policy', result.formData.policy);
formData.append('OSSAccessKeyId', result.formData.OSSAccessKeyId);
formData.append('signature', result.formData.signature);
formData.append('Content-Type', result.formData['Content-Type']);
formData.append('file', file);

const uploadResponse = await fetch(result.action, {
  method: 'POST',
  body: formData,
  credentials: 'omit',
});
```

**⚠️ 注意**：这种方法需要修改较多代码，建议优先使用方案 1。

---

## 🎯 推荐方案

**强烈推荐使用方案 1（ossutil 命令行工具）**，因为：
1. ✅ 不需要修改代码
2. ✅ 配置一次即可，永久生效
3. ✅ 符合 CORS 标准规范
4. ✅ 不影响现有功能

---

## 📝 验证修复

修复后，运行诊断脚本：

```bash
node scripts/deep-diagnose-oss.cjs
```

检查以下测试项：
- ✅ CORS 预检请求测试应该通过
- ✅ 不应该再有 "缺少 OPTIONS 方法" 的错误

---

## 🔍 如果仍然失败

如果使用方案 1 后仍然失败，请检查：

1. **确认 CORS 配置已生效**：
   ```bash
   # 查看当前 CORS 配置
   ossutil cors --method get oss://xhs-content
   ```

2. **检查浏览器控制台**：
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 检查 OPTIONS 请求的响应头是否包含 `Access-Control-Allow-Methods: OPTIONS`

3. **清除浏览器缓存**：
   - 浏览器可能缓存了旧的 CORS 响应
   - 尝试使用无痕模式或清除缓存

---

## 📚 参考文档

- 阿里云 OSS CORS 配置文档：https://help.aliyun.com/document_detail/31988.html
- ossutil 工具文档：https://help.aliyun.com/document_detail/120075.html
- CORS 预检请求说明：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS#预检请求

