# 迁移到阿里云 OSS + CDN 检查清单

## 📋 迁移步骤清单

### ✅ 第一步：准备工作

- [ ] 获取 Railway 后端域名地址
  - 登录 Railway：https://railway.app
  - 找到你的后端项目
  - 复制后端域名（例如：`xiaohongshu-backend.railway.app`）

- [ ] 检查是否已有域名
  - 如果没有域名，需要先购买（参考 `QUICK_DEPLOY_CN.md`）

---

### ✅ 第二步：配置前端构建

- [ ] 创建 `.env.production` 文件
  - 文件路径：`frontend/.env.production`
  - 内容：`VITE_API_BASE_URL=https://你的railway域名.railway.app`

---

### ✅ 第三步：阿里云服务配置

- [ ] 购买域名（如果还没有）
  - 访问：https://wanwang.aliyun.com
  - 购买 .com 域名（约 69元/年）
  - 完成实名认证

- [ ] 开通 OSS 服务
  - 登录阿里云控制台：https://ecs.console.aliyun.com
  - 搜索 "对象存储 OSS"
  - 开通服务（按量付费）

- [ ] 创建 OSS Bucket
  - Bucket 名称：例如 `xiaohongshu-frontend`
  - 地域：选择离你最近的地域（如：华东1-杭州）
  - 读写权限：**公共读**（重要！）

- [ ] 开启静态网站托管
  - 进入 Bucket → "Bucket配置" → "静态网站托管"
  - 开启并设置：
    - 默认首页：`index.html`
    - 默认404页：`index.html`

---

### ✅ 第四步：CDN 配置

- [ ] 开通 CDN 服务
  - 在阿里云控制台搜索 "CDN"
  - 开通服务（免费开通）

- [ ] 添加加速域名
  - 加速域名：填写你购买的域名
  - 加速区域：仅中国内地
  - 源站类型：OSS域名
  - 源站信息：选择你的 OSS Bucket

- [ ] 配置 HTTPS
  - 进入 CDN 控制台 → "域名管理"
  - 找到你的加速域名 → "HTTPS配置"
  - 开启 HTTPS，选择免费证书
  - 等待证书签发（约10分钟）

---

### ✅ 第五步：域名解析

- [ ] 配置 DNS 解析
  - 进入 "域名" → "解析设置"
  - 添加 CNAME 记录：
    - 记录类型：CNAME
    - 主机记录：www（或 @）
    - 记录值：CDN 提供的 CNAME 地址
    - TTL：10分钟

---

### ✅ 第六步：部署前端代码

- [ ] 构建前端
  ```bash
  cd frontend
  npm install
  npm run build
  ```

- [ ] 上传到 OSS
  - 方式1：使用脚本自动上传
  - 方式2：手动在 OSS 控制台上传 `dist` 目录中的所有文件

---

### ✅ 第七步：配置后端 CORS

- [ ] 在 Railway 添加环境变量
  - 登录 Railway：https://railway.app
  - 进入后端项目 → "Variables"
  - 添加：`FRONTEND_URL=https://你的阿里云域名.com`
  - 保存（Railway 会自动重新部署）

---

### ✅ 第八步：测试验证

- [ ] 等待 DNS 解析生效（约10-30分钟）
- [ ] 访问你的阿里云域名
- [ ] 测试管理员登录
- [ ] 测试内容列表
- [ ] 测试用户领取功能
- [ ] 检查浏览器控制台是否有错误

---

## 📝 详细步骤参考

- **快速部署指南**：`QUICK_DEPLOY_CN.md`
- **详细部署指南**：`DEPLOY_CN.md`
- **阿里云+Railway配置**：`ALIYUN_RAILWAY_CONFIG.md`

---

## ⚠️ 注意事项

1. **域名备案**：
   - 使用国内 CDN，域名必须备案
   - 备案时间：约15-20个工作日
   - 备案期间网站需要可以访问

2. **API 地址配置**：
   - 确保 `.env.production` 中的 Railway 地址正确
   - 确保地址包含 `https://` 协议

3. **CORS 配置**：
   - 确保 Railway 的 `FRONTEND_URL` 环境变量正确
   - 确保域名包含 `https://` 协议

---

**开始迁移吧！** 🚀


