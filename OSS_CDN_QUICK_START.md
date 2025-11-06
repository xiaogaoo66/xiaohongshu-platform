# 阿里云 OSS + CDN 快速上手指南

## 🚀 5 分钟快速部署

### 第一步：本地构建
```bash
cd frontend
npm install
npm run build
```

### 第二步：创建 OSS Bucket
1. 登录 https://oss.console.aliyun.com/
2. 创建 Bucket：
   - 名称：`xiaohongshu-frontend-xxxxx`（全局唯一）
   - 权限：**公共读**
   - 地域：选择最近的

### 第三步：启用静态网站托管
1. Bucket → 基础设置 → 静态网站托管 → 设置
2. 配置：
   - 默认首页：`index.html`
   - 默认 404 页：`index.html` ⚠️ 重要！

### 第四步：上传文件
**方法 1：控制台**
- 文件管理 → 上传文件 → 选择 `frontend/dist` 所有内容

**方法 2：命令行**
```bash
# 先安装配置 ossutil
ossutil config

# 上传
cd frontend
ossutil cp -r dist/ oss://你的bucket名称/ --update
```

### 第五步：测试访问
访问：`http://你的bucket名称.oss-cn-地域.aliyuncs.com`

---

## 🔧 配置 CDN（可选，推荐）

### 1. 添加 CDN 域名
- CDN 控制台：https://cdn.console.aliyun.com/
- 添加域名 → 源站选择 OSS Bucket

### 2. 配置缓存规则
- HTML：0 秒（不缓存）
- JS/CSS：1 年（长期缓存）

### 3. 配置 HTTPS
- 开启 HTTPS
- 使用免费证书
- 开启 HTTP 强制跳转 HTTPS

---

## 🔗 更新后端 CORS

在 Railway（或你的后端平台）添加环境变量：
```
FRONTEND_URL=https://frontend.yourdomain.com
```
或
```
FRONTEND_URL=http://你的bucket名称.oss-cn-地域.aliyuncs.com
```

然后重新部署后端。

---

## ✅ 验证清单

- [ ] OSS 直接访问可以打开页面
- [ ] 刷新页面不会 404（前端路由正常）
- [ ] API 请求正常（无 CORS 错误）
- [ ] 所有功能测试通过

---

## 📚 详细文档

- 完整配置指南：`OSS_CDN_SETUP_GUIDE.md`
- 部署指南：`FRONTEND_DEPLOY_GUIDE.md`

---

## 🆘 常见问题

**页面空白？**
- 检查浏览器控制台错误
- 确认文件路径正确

**刷新 404？**
- 确认 OSS 静态网站托管 404 页设置为 `index.html`

**CORS 错误？**
- 检查后端 `FRONTEND_URL` 环境变量
- 重新部署后端

---

**配置完成后，告诉我前端地址，我可以帮你测试！** 🚀

