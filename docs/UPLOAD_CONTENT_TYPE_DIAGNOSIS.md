# 🩺 Content-Type 诊断脚本

当前最常见的 OSS 上传失败原因之一，就是**前端请求携带的 Content-Type 与后端签名时记录的值不一致**。为避免凭感觉排查，现在提供一个一步到位的 CLI 工具，直接告诉你“服务器到底返回了什么”。

## 安装/环境要求

- Node.js ≥ 18（Railway、开发机都满足）
- 已经部署好后端（本地或线上均可）

## 使用方法

```bash
# 默认连本地 http://localhost:3333
node scripts/diagnose-upload-request.cjs

# 指定线上域名 & 自定义 Content-Type
node scripts/diagnose-upload-request.cjs \
  --url https://api.yourdomain.com \
  --filename cover.png \
  --content-type image/png
```

也可以设置环境变量 `UPLOAD_API_URL=https://api.yourdomain.com`，省掉 `--url`。

## 输出解读

脚本会输出以下表格：

- `requestContentType`：脚本发送给后端的 `contentType`
- `expectedContentType`：后端响应中的 `expectedContentType`
- `contentTypeMatches`：
  - `✅ yes`：两边一致
  - `❌ no`：不一致（前端必挂）
  - `server did not return`：后端压根没带该字段
- `presignedUrlPresent`：后端有没有返回 URL
- `took`：接口耗时

最后会打印原始响应（含 `presignedUrl`），方便进一步分析。

## 常见结论

- `expectedContentType` 是 `'(null)'`：后端没把 Content-Type 传进去，检查 `upload.service.ts`
- `expectedContentType` 和 `requestContentType` 不同：前端传的值和后端记录的不一致（通常是 `file.type` 在不同浏览器为空）
- `presignedUrlPresent` 为 `❌`：后端 OSS 配置不完整，先跑 `scripts/check-oss-upload-config.cjs`

## 结合浏览器调试

1. 先在浏览器里触发上传，确认是否有 “Content-Type 不匹配” 提示
2. 立刻运行诊断脚本，确认后端真实返回值
3. 如果脚本显示 “server did not return”，把后端日志发我继续排查

## 后续扩展

- 可以配合 `scripts/list-oss-files.cjs` 检查文件是否已上传
- 若需要批量测试多个 Content-Type，可以写一个简单的 shell 循环调用本脚本

> **结论**：以后遇到 Content-Type 问题，先跑脚本拿数据，不再凭感觉猜。


