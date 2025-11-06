# Vercel 自定义域名配置指南

## 🎯 概述

如果你想在现有的 Vercel 部署上添加自定义域名，只需要：
1. ✅ 购买域名
2. ✅ 在 Vercel 中添加自定义域名
3. ✅ 配置 DNS 解析

**优点**：
- ✅ 不需要重新部署代码
- ✅ 配置简单（约10分钟）
- ✅ 自动配置 HTTPS 证书

**注意事项**：
- ⚠️ Vercel 服务器在国外，中国大陆用户访问可能较慢
- ⚠️ 如果 Vercel 被墙，自定义域名也可能无法访问
- ⚠️ 如果访问不稳定，建议考虑迁移到国内平台（如阿里云 OSS + CDN）

---

## 📝 详细步骤

### 第一步：购买域名（约10分钟）

#### 推荐服务商

**国内服务商（需要实名认证）：**
- **阿里云（万网）**：https://wanwang.aliyun.com
  - 价格：.com 约 69元/年，.cn 约 29-55元/年
  - 优势：与国内服务集成好，DNS 解析稳定
- **腾讯云**：https://dnspod.cloud.tencent.com
  - 价格：与阿里云类似
  - 优势：DNS 解析服务好

**国际服务商（无需实名）：**
- **Namecheap**：https://www.namecheap.com
  - 价格：.com 约 $8-12/年（约60-90元）
  - 优势：价格便宜，支持支付宝
- **GoDaddy**：https://www.godaddy.com
  - 价格：.com 约 $12-15/年（约90-120元）

#### 购买步骤（以阿里云为例）

1. **访问阿里云域名购买页面**
   - 网址：https://wanwang.aliyun.com
   - 注册/登录阿里云账号

2. **搜索并购买域名**
   - 输入你想要的域名（例如：`xiaohongshu-content.com`）
   - 选择 .com 后缀（约 69元/年）
   - 加入购物车并支付

3. **完成域名实名认证**（国内域名必需）
   - 进入 **"域名"** > **"域名列表"**
   - 找到购买的域名，点击 **"实名认证"**
   - 填写个人信息，上传身份证
   - 等待审核（1-3个工作日）

---

### 第二步：在 Vercel 中添加自定义域名（约5分钟）

1. **登录 Vercel 控制台**
   - 访问：https://vercel.com
   - 登录你的账号

2. **进入项目设置**
   - 点击你的项目
   - 进入 **"Settings"**（设置）标签
   - 点击左侧 **"Domains"**（域名）

3. **添加自定义域名**
   - 点击 **"Add Domain"**（添加域名）
   - 输入你购买的域名（例如：`xiaohongshu-content.com`）
   - 或者输入带 www 的域名（例如：`www.xiaohongshu-content.com`）
   - 点击 **"Add"**

4. **查看配置信息**
   - Vercel 会显示 DNS 配置信息
   - 通常有两种方式：
     - **方式 1（推荐）**：A 记录，指向 Vercel 的 IP 地址
     - **方式 2**：CNAME 记录，指向 Vercel 提供的 CNAME 地址（例如：`cname.vercel-dns.com`）

---

### 第三步：配置 DNS 解析（约5分钟）

#### 方式 1：使用 CNAME 记录（推荐，简单）

1. **进入域名管理**
   - 如果你在阿里云购买的域名：
     - 登录阿里云控制台
     - 进入 **"域名"** > **"解析设置"**
     - 找到你购买的域名，点击 **"解析"**

2. **添加 CNAME 记录**
   - 点击 **"添加记录"**
   - 填写信息：
     - **记录类型**：CNAME
     - **主机记录**：
       - 如果要使用 `www.xiaohongshu-content.com`：填写 `www`
       - 如果要使用根域名 `xiaohongshu-content.com`：填写 `@` 或留空
     - **记录值**：填写 Vercel 提供的 CNAME 地址（通常在 Vercel 的域名设置页面显示）
       - 例如：`cname.vercel-dns.com`
     - **TTL**：10分钟（或默认）
   - 点击 **"确认"**

3. **根域名配置（可选）**
   - 如果你想要使用 `xiaohongshu-content.com`（不带 www）
   - 需要添加额外的 A 记录（见下方方式 2）

#### 方式 2：使用 A 记录（根域名必需）

1. **获取 Vercel IP 地址**
   - 在 Vercel 域名设置页面查看
   - 或者在 Vercel 文档中查找当前 IP 地址
   - 通常 Vercel 使用多个 IP，需要都添加

2. **添加 A 记录**
   - 进入域名解析设置
   - 点击 **"添加记录"**
   - 填写信息：
     - **记录类型**：A
     - **主机记录**：`@`（表示根域名）
     - **记录值**：Vercel 的 IP 地址（可能有多个，需要都添加）
       - 例如：`76.76.21.21`
     - **TTL**：10分钟
   - 点击 **"确认"**
   - 如果有多个 IP，需要添加多条 A 记录

---

### 第四步：等待生效（约10-30分钟）

1. **等待 DNS 解析生效**
   - DNS 解析通常需要 10-30 分钟生效
   - 可以在命令行测试：`ping xiaohongshu-content.com`
   - 或者在浏览器访问：`https://xiaohongshu-content.com`

2. **等待 Vercel 配置 HTTPS**
   - Vercel 会自动申请 SSL 证书
   - 通常在 DNS 解析生效后 5-10 分钟完成
   - 在 Vercel 的域名设置页面可以看到证书状态

3. **验证配置**
   - 访问你的自定义域名
   - 应该会自动重定向到 HTTPS
   - 检查网站是否正常工作

---

## 🔧 配置选项

### 同时使用 www 和根域名

如果你想同时支持：
- `xiaohongshu-content.com`
- `www.xiaohongshu-content.com`

1. **在 Vercel 中添加两个域名**
   - 添加 `xiaohongshu-content.com`
   - 添加 `www.xiaohongshu-content.com`

2. **配置 DNS 解析**
   - **根域名**：使用 A 记录指向 Vercel IP
   - **www 子域名**：使用 CNAME 记录指向 Vercel CNAME

3. **设置重定向（可选）**
   - 在 Vercel 项目设置中配置
   - 可以将根域名重定向到 www，或反之

### 使用 Cloudflare 加速（可选）

如果你想让国内访问更快：

1. **使用 Cloudflare DNS**
   - 将域名的 DNS 服务器改为 Cloudflare 的
   - 在 Cloudflare 添加域名
   - 配置 CNAME 记录指向 Vercel

2. **开启 Cloudflare CDN**
   - 自动加速访问
   - 免费套餐足够使用

---

## ⚠️ 注意事项

### 1. 访问速度问题

**Vercel 服务器在国外：**
- ✅ 优点：全球 CDN 加速
- ⚠️ 缺点：中国大陆用户访问可能较慢
- ⚠️ 如果 Vercel 被墙，自定义域名也无法访问

**解决方案**：
- 如果访问速度慢，建议迁移到国内平台（阿里云 OSS + CDN）
- 参考文档：`DEPLOY_CN.md`

### 2. DNS 解析时间

- DNS 解析通常需要 10-30 分钟生效
- 不同地区生效时间可能不同
- 可以使用在线工具检查：https://dnschecker.org

### 3. HTTPS 证书

- Vercel 会自动配置免费 SSL 证书（Let's Encrypt）
- 证书通常自动续期，无需手动操作
- 证书配置需要几分钟时间

### 4. 域名备案

- ⚠️ **注意**：如果使用国内域名服务商，域名需要实名认证
- ⚠️ 如果未来迁移到国内平台，域名还需要备案（约15-20个工作日）
- ⚠️ 如果只使用 Vercel（国外服务器），通常不需要备案

---

## 🎯 验证步骤

### 1. 检查 DNS 解析

```bash
# Windows
nslookup xiaohongshu-content.com

# Mac/Linux
dig xiaohongshu-content.com
```

### 2. 检查 HTTPS

- 访问：`https://xiaohongshu-content.com`
- 查看浏览器地址栏，应该有锁图标（🔒）
- 点击锁图标，查看证书信息

### 3. 测试网站功能

- 访问所有路由（首页、管理员登录、用户领取等）
- 测试功能是否正常
- 检查 API 调用是否正常

---

## 🔄 更新代码

添加自定义域名后，代码更新方式不变：

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "更新内容"
   git push origin main
   ```

2. **Vercel 自动部署**
   - Vercel 会自动检测 GitHub 推送
   - 自动重新构建和部署
   - 新的自定义域名也会自动更新

3. **验证部署**
   - 等待部署完成（约2-3分钟）
   - 访问自定义域名验证更新

---

## 💰 费用估算

| 项目 | 费用 | 说明 |
|------|------|------|
| **域名（.com）** | 69元/年 | 阿里云购买 |
| **Vercel 托管** | 免费 | 免费套餐足够使用 |
| **总计** | 约 69元/年 | 非常便宜！ |

**Vercel 免费套餐限制：**
- ✅ 100GB 带宽/月（通常足够使用）
- ✅ 自动 HTTPS 证书
- ✅ 全球 CDN 加速
- ✅ 自动部署

---

## ❓ 常见问题

### Q1: 为什么访问很慢？

**A:** Vercel 服务器在国外，中国大陆用户访问可能较慢。解决方案：
1. 使用 Cloudflare CDN 加速
2. 或者迁移到国内平台（阿里云 OSS + CDN）

### Q2: 自定义域名无法访问？

**A:** 可能的原因：
1. DNS 解析未生效（等待10-30分钟）
2. HTTPS 证书未配置完成（等待5-10分钟）
3. DNS 配置错误（检查解析设置）

### Q3: 是否需要备案？

**A:** 
- 如果只使用 Vercel（国外服务器），通常不需要备案
- 如果未来迁移到国内平台，需要备案（约15-20个工作日）

### Q4: 可以同时使用 www 和根域名吗？

**A:** 可以！在 Vercel 中添加两个域名，分别配置 DNS 解析。

### Q5: 如何从 Vercel 迁移到国内平台？

**A:** 参考文档：`DEPLOY_CN.md` 和 `QUICK_DEPLOY_CN.md`

---

## 📞 需要帮助？

1. **Vercel 官方文档**
   - 自定义域名：https://vercel.com/docs/concepts/projects/domains
   - 支持：https://vercel.com/support

2. **阿里云 DNS 帮助**
   - DNS 解析文档：https://help.aliyun.com/product/29690.html
   - 客服电话：95187

3. **项目文档**
   - 详细部署指南：`DEPLOY_CN.md`
   - 国内部署指南：`QUICK_DEPLOY_CN.md`

---

## ✅ 配置检查清单

- [ ] 已购买域名
- [ ] 域名已完成实名认证
- [ ] 已在 Vercel 添加自定义域名
- [ ] 已配置 DNS 解析（A 记录或 CNAME 记录）
- [ ] DNS 解析已生效（可以 ping 通）
- [ ] HTTPS 证书已配置（浏览器显示锁图标）
- [ ] 网站可以正常访问
- [ ] 所有路由都正常工作

---

**配置完成后，你的网站就可以通过自定义域名访问了！** 🎉

---

**最后更新**：2025-11-03

