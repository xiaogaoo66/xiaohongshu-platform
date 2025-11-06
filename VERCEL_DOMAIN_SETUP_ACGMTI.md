# Vercel 自定义域名配置指南 - acgmbti.online

## 🎯 你的域名
**域名：** `acgmbti.online`

---

## 📝 第一步：在 Vercel 添加域名

### 1.1 登录 Vercel 控制台

1. 访问：https://vercel.com
2. 登录你的账号（如果没有账号，需要先注册）

### 1.2 进入项目设置

1. 在 Vercel 控制台，找到你的前端项目
2. 点击项目名称进入项目详情
3. 点击顶部菜单 **"Settings"**（设置）
4. 在左侧菜单中，点击 **"Domains"**（域名）

### 1.3 添加自定义域名

1. 在域名页面，点击 **"Add Domain"**（添加域名）按钮
2. 输入你的域名：
   - **根域名**：`acgmbti.online`
   - **或者 www 子域名**：`www.acgmbti.online`
   - 也可以两个都添加（推荐）
3. 点击 **"Add"** 按钮

### 1.4 查看 DNS 配置信息

添加域名后，Vercel 会显示需要配置的 DNS 记录：

**通常会有两种配置方式：**

#### 方式 A：CNAME 记录（推荐，简单）

Vercel 会显示类似这样的信息：
```
类型：CNAME
名称：@ 或 www
值：cname.vercel-dns.com
```

或者：
```
类型：CNAME
名称：@ 或 www
值：76.76.21.21
```

#### 方式 B：A 记录（根域名必需）

如果使用根域名 `acgmbti.online`，可能需要添加 A 记录：
```
类型：A
名称：@
值：76.76.21.21
（可能有多个 IP，需要都添加）
```

**⚠️ 重要：**
- 复制 Vercel 显示的 DNS 配置信息
- 这些信息会在下一步配置域名解析时用到

---

## 📝 第二步：配置域名 DNS 解析

### 2.1 确定域名服务商和 DNS 管理方式

**你的域名服务商：Spaceship** ✅

⚠️ **重要：检查你的 DNS 管理方式**

你的域名可能使用：
1. **Spaceship 默认 DNS**：在 Spaceship 直接管理 DNS
2. **Cloudflare DNS**：名称服务器指向 Cloudflare（如 `gail.ns.cloudflare.com`）
3. **其他第三方 DNS**：如 Namecheap、GoDaddy 等

**如何检查：**
- 在 Spaceship 域名管理页面，查看右侧 "名称服务器和DNS" 面板
- 如果显示 "自定义名称服务器" 且指向 Cloudflare，说明 DNS 在 Cloudflare 管理
- 如果显示 Spaceship 默认名称服务器，说明在 Spaceship 管理

**常见域名服务商：**
- **Spaceship**：https://www.spaceship.com/（你的域名在这里）
- **Cloudflare**：https://dash.cloudflare.com/（如果使用 Cloudflare DNS）
- **阿里云（万网）**：https://dns.console.aliyun.com/
- **腾讯云**：https://console.cloud.tencent.com/domain
- **GoDaddy**：https://www.godaddy.com/
- **Namecheap**：https://www.namecheap.com/

### 2.2 在域名服务商配置 DNS

#### 🌟 如果域名在 Spaceship 且使用 Cloudflare DNS（你的情况）：

**当前状态：** 你的域名 DNS 通过 Cloudflare 管理（名称服务器：`gail.ns.cloudflare.com` 和 `micah.ns.cloudflare.com`）

**你有两个选择：**

**选择 A：在 Cloudflare 配置 DNS（如果你有 Cloudflare 账号）**

⚠️ **重要提示：** Spaceship 的"高级DNS"页面**不能直接跳转到 Cloudflare**，你需要手动访问 Cloudflare 网站。

1. **打开 Cloudflare 网站**
   - 在浏览器中**新开一个标签页**
   - 直接访问：**https://dash.cloudflare.com/**
   - 这是 Cloudflare 的官方网站，不要从 Spaceship 页面找按钮

2. **登录 Cloudflare**
   - 如果你有 Cloudflare 账号，直接登录
   - 如果没有账号，需要先注册（免费）
   - 注册时可能需要验证邮箱

3. **找到域名**
   - 在 Cloudflare 控制台，找到 `acgmbti.online`
   - 点击域名进入管理页面

4. **进入 DNS 设置**
   - 点击左侧菜单 **"DNS"** → **"Records"**

5. **添加 DNS 记录**

   **情况 1：配置 www 子域名（推荐）**
   
   - 点击 **"Add record"** 按钮
   - 配置参数：
     - **Type**：选择 **"CNAME"**
     - **Name**：输入 `www`
     - **Target**：粘贴 Vercel 提供的 CNAME 值
       - 例如：`cname.vercel-dns.com`
       - ⚠️ **不要带** `http://` 或 `https://`
     - **Proxy status**：点击云朵图标，确保是 **灰色（DNS only）**，不要启用代理
       - ⚠️ **重要**：必须关闭代理，否则 Vercel 无法正确验证域名
     - **TTL**：选择 **"Auto"**
   - 点击 **"Save"** 保存

   **情况 2：配置根域名 `acgmbti.online`**
   
   如果 Vercel 要求使用 A 记录：
   - 点击 **"Add record"** 按钮
   - 配置参数：
     - **Type**：选择 **"A"**
     - **Name**：输入 `@`（表示根域名）
     - **IPv4 address**：粘贴 Vercel 提供的 IP 地址
       - 例如：`76.76.21.21`
       - 如果有多个 IP，需要添加多条 A 记录
     - **Proxy status**：点击云朵图标，确保是 **灰色（DNS only）**
     - **TTL**：选择 **"Auto"**
   - 点击 **"Save"** 保存
   - 如果有多个 IP，重复添加多条 A 记录

   **如果 Vercel 允许根域名使用 CNAME：**
   - 点击 **"Add record"** 按钮
   - 配置参数：
     - **Type**：选择 **"CNAME"**
     - **Name**：输入 `@`
     - **Target**：粘贴 Vercel 提供的 CNAME 值
     - **Proxy status**：**灰色（DNS only）**
     - **TTL**：Auto
   - 点击 **"Save"** 保存

5. **同时配置根域名和 www（推荐）**

   如果你想同时支持：
   - `acgmbti.online`（根域名）
   - `www.acgmbti.online`（www 子域名）

   **步骤：**
   - 在 Vercel 中添加两个域名：
     1. `acgmbti.online`
     2. `www.acgmbti.online`
   - 在 Cloudflare DNS 中：
     1. 添加 A 记录：Name = `@`，IPv4 address = Vercel 提供的 IP（用于根域名）
     2. 添加 CNAME 记录：Name = `www`，Target = Vercel 提供的 CNAME（用于 www）
     - 或者根据 Vercel 提示，两个都使用 CNAME
   - **⚠️ 重要**：所有记录的 Proxy status 必须是 **灰色（DNS only）**

6. **验证 DNS 记录**
   - 保存后，检查 DNS 记录列表，确认记录已添加
   - 确认所有记录的云朵图标都是灰色（未启用代理）

**📝 Cloudflare DNS 配置示例：**

```
记录 1（根域名）：
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy: 关闭（灰色云朵）
TTL: Auto

记录 2（www 子域名）：
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy: 关闭（灰色云朵）
TTL: Auto
```

**⚠️ Cloudflare 重要注意事项：**
- **必须关闭代理（Proxy）**：确保云朵图标是灰色，不要启用橙色代理
- 如果启用了代理，Vercel 无法正确验证域名所有权
- 关闭代理后，DNS 记录会立即生效

---

**选择 B：切换回 Spaceship 默认名称服务器（⭐ 推荐，更简单）**

如果你不想使用 Cloudflare，或者找不到 Cloudflare 账号，可以切换回 Spaceship 默认 DNS，这样就能在 Spaceship 直接管理 DNS 了。

**步骤：**

1. **在当前 Spaceship "高级DNS" 页面切换名称服务器**
   - 在页面顶部找到 **"名称服务器"** 区域
   - 看到显示：`gail.ns.cloudflare.com` 和 `micah.ns.cloudflare.com`
   - 点击旁边的 **"更改"** 按钮

2. **选择 Spaceship 默认名称服务器**
   - 在弹出的窗口中，选择 **"使用 Spaceship 默认名称服务器"** 或 **"Spaceship DNS"**（或类似选项）
   - 确认更改

3. **或者使用页面底部的按钮**
   - 滚动到页面底部
   - 看到 "使用自定义DNS管理" 区域
   - 点击 **"更改nameserver"** 按钮
   - 选择切换到 Spaceship 默认名称服务器

4. **等待名称服务器切换**
   - 切换后需要等待 **10-30 分钟** 让更改生效
   - 可以在线工具检查：https://dnschecker.org/
   - 输入域名 `acgmbti.online`，检查名称服务器是否已切换

5. **切换完成后，按照下面的 Spaceship DNS 配置步骤操作**
   - 等待 10-30 分钟后，刷新 Spaceship 页面
   - 现在应该可以直接在 Spaceship 添加 DNS 记录了

---

#### 🌟 如果域名在 Spaceship 且使用 Spaceship 默认 DNS：

1. **登录 Spaceship 控制台**
   - 访问：https://www.spaceship.com/
   - 点击右上角 **"Sign In"** 登录你的账号

2. **进入域名管理**
   - 登录后，在控制面板中找到 **"Domains"** 或 **"My Domains"**
   - 在域名列表中，找到 `acgmbti.online`
   - 点击域名进入管理页面

3. **找到 DNS 管理**
   - 在域名管理页面，找到 **"DNS Management"** 或 **"DNS Records"** 选项
   - 点击进入 DNS 设置页面

4. **添加 DNS 记录**

   **情况 1：配置 www 子域名（推荐，最简单）**
   
   - 点击 **"Add Record"** 或 **"添加记录"** 按钮
   - 配置参数：
     - **Type（记录类型）**：选择 **"CNAME"**
     - **Host（主机名）**：输入 `www`
     - **Value（值）**：粘贴 Vercel 提供的 CNAME 值
       - 例如：`cname.vercel-dns.com`
       - ⚠️ **不要带** `http://` 或 `https://`，只输入域名本身
     - **TTL**：选择 **"600"**（10 分钟）或保持默认值
   - 点击 **"Save"** 或 **"保存"** 按钮

   **情况 2：配置根域名 `acgmbti.online`**
   
   如果 Vercel 要求使用 A 记录（根域名通常需要 A 记录）：
   - 点击 **"Add Record"** 按钮
   - 配置参数：
     - **Type（记录类型）**：选择 **"A"**
     - **Host（主机名）**：输入 `@` 或留空（表示根域名）
     - **Value（值）**：粘贴 Vercel 提供的 IP 地址
       - 例如：`76.76.21.21`
       - 如果有多个 IP，需要添加多条 A 记录
     - **TTL**：选择 **"600"**（10 分钟）
   - 点击 **"Save"** 保存
   - 如果有多个 IP，重复添加多条 A 记录

   **如果 Vercel 允许根域名使用 CNAME：**
   - 点击 **"Add Record"** 按钮
   - 配置参数：
     - **Type**：选择 **"CNAME"**
     - **Host**：输入 `@` 或留空
     - **Value**：粘贴 Vercel 提供的 CNAME 值
     - **TTL**：600
   - 点击 **"Save"** 保存

5. **同时配置根域名和 www（推荐）**

   如果你想同时支持：
   - `acgmbti.online`（根域名）
   - `www.acgmbti.online`（www 子域名）

   **步骤：**
   - 在 Vercel 中添加两个域名：
     1. `acgmbti.online`
     2. `www.acgmbti.online`
   - 在 Spaceship DNS 中：
     1. 添加 A 记录：Host = `@`，Value = Vercel 提供的 IP（用于根域名）
     2. 添加 CNAME 记录：Host = `www`，Value = Vercel 提供的 CNAME（用于 www）
     - 或者根据 Vercel 提示，两个都使用 CNAME

6. **验证 DNS 记录**
   - 保存后，检查 DNS 记录列表，确认记录已添加
   - 记录应该显示在列表中

**📝 Spaceship DNS 配置示例：**

```
记录 1（根域名）：
Type: A
Host: @
Value: 76.76.21.21
TTL: 600

记录 2（www 子域名）：
Type: CNAME
Host: www
Value: cname.vercel-dns.com
TTL: 600
```

**⚠️ 注意事项：**
- 确保记录值正确（不要带协议前缀 `http://` 或 `https://`）
- 如果 Vercel 显示多个 IP，需要添加多条 A 记录
- 保存后等待 10-30 分钟让 DNS 生效

---

#### 如果域名在阿里云：

#### 如果域名在其他服务商：

**GoDaddy：**
1. 登录 GoDaddy 账号
2. 进入 "My Products" → "Domains"
3. 找到 `acgmbti.online`，点击 "DNS"
4. 添加记录：
   - **Type**: CNAME 或 A
   - **Name**: `@` 或 `www`
   - **Value**: Vercel 提供的值
   - **TTL**: 600

**Namecheap：**
1. 登录 Namecheap 账号
2. 进入 "Domain List"
3. 找到 `acgmbti.online`，点击 "Manage"
4. 进入 "Advanced DNS" 标签
5. 添加记录：
   - **Type**: CNAME Record 或 A Record
   - **Host**: `@` 或 `www`
   - **Value**: Vercel 提供的值
   - **TTL**: Automatic

**腾讯云：**
1. 登录腾讯云控制台
2. 进入 "域名与网站" → "DNS 解析 DNSPod"
3. 找到 `acgmbti.online`，点击 "解析"
4. 添加记录：
   - **主机记录**：`@` 或 `www`
   - **记录类型**：CNAME 或 A
   - **记录值**：Vercel 提供的值

---

## 📝 第三步：等待 DNS 解析生效

### 3.1 等待时间

- **DNS 解析生效时间**：通常需要 **10 分钟到 2 小时**，最长不超过 48 小时
- **不同地区生效时间可能不同**

### 3.2 验证 DNS 解析

在配置 DNS 后，可以测试解析是否生效：

**Windows PowerShell：**
```powershell
# 测试域名解析
nslookup acgmbti.online

# 或使用 ping
ping acgmbti.online
```

**Mac/Linux：**
```bash
# 使用 dig 命令
dig acgmbti.online

# 或使用 ping
ping acgmbti.online
```

**在线工具：**
- https://dnschecker.org/ - 输入域名，查看全球 DNS 解析状态
- https://www.whatsmydns.net/ - 检查 DNS 解析

### 3.3 检查 Vercel 域名状态

1. 回到 Vercel 控制台 → 项目 → Settings → Domains
2. 查看你添加的域名状态：
   - **"Valid Configuration"**（配置有效）✅
   - **"Validating"**（验证中）⏳
   - **"Invalid Configuration"**（配置无效）❌

---

## 📝 第四步：等待 HTTPS 证书配置

### 4.1 自动配置

- Vercel 会自动为你的域名申请 **SSL 证书**（Let's Encrypt）
- 通常在 DNS 解析生效后 **5-10 分钟**完成
- 无需手动操作

### 4.2 检查证书状态

1. 在 Vercel → Settings → Domains
2. 查看域名状态：
   - 如果显示 **"Valid"**（有效）✅，说明配置成功
   - 如果显示 **"Validating"**（验证中）⏳，需要等待

---

## 📝 第五步：测试访问

### 5.1 访问域名

等待 DNS 和 HTTPS 配置完成后（通常 10-30 分钟），在浏览器中访问：

```
https://acgmbti.online
```

或（如果配置了 www）：

```
https://www.acgmbti.online
```

### 5.2 验证功能

- ✅ 页面正常加载
- ✅ 浏览器地址栏显示锁图标（🔒）表示 HTTPS 正常
- ✅ 前端路由正常工作（刷新页面不会 404）
- ✅ API 请求正常（检查浏览器 Network 标签）

### 5.3 如果访问失败

**问题 1：DNS 解析未生效**
- 等待更长时间（最长 48 小时）
- 清除本地 DNS 缓存：
  ```powershell
  # Windows
  ipconfig /flushdns
  ```

**问题 2：HTTPS 证书未配置完成**
- 等待 5-10 分钟
- 检查 Vercel 域名状态

**问题 3：DNS 配置错误**
- 检查 DNS 记录是否正确
- 确认记录值是否正确（不要带协议前缀）

---

## 🔧 常见问题

### Q1: 根域名和 www 子域名可以同时使用吗？

**A:** 可以！在 Vercel 中添加两个域名，然后分别配置 DNS 解析：
- `acgmbti.online`：使用 A 记录或 CNAME（根据 Vercel 提示）
- `www.acgmbti.online`：使用 CNAME 记录

### Q2: 配置后多久可以访问？

**A:** 
- DNS 解析：10 分钟到 2 小时
- HTTPS 证书：5-10 分钟
- **总计：通常 15-30 分钟**，最长不超过 48 小时

### Q3: 需要备案吗？

**A:** 
- 如果只使用 Vercel（国外服务器），**通常不需要备案**
- 如果未来迁移到国内平台（如阿里云 OSS），需要备案

### Q4: 访问速度慢怎么办？

**A:** 
- Vercel 服务器在国外，中国大陆用户访问可能较慢
- 如果速度慢，可以考虑：
  1. 使用 Cloudflare CDN 加速
  2. 迁移到国内平台（阿里云 OSS + CDN）

### Q5: 如何更新代码？

**A:** 
- 推送代码到 GitHub，Vercel 会自动重新部署
- 自定义域名也会自动更新

---

## ✅ 配置检查清单

- [ ] 已在 Vercel 添加域名 `acgmbti.online`
- [ ] 已在域名服务商配置 DNS 解析（CNAME 或 A 记录）
- [ ] DNS 解析已生效（可以 ping 通或 nslookup 成功）
- [ ] Vercel 显示域名状态为 "Valid"（有效）
- [ ] HTTPS 证书已配置（浏览器显示锁图标）
- [ ] 网站可以正常访问 `https://acgmbti.online`
- [ ] 所有功能正常工作

---

## 📞 需要帮助？

1. **Vercel 官方文档**
   - 自定义域名：https://vercel.com/docs/concepts/projects/domains
   - 支持：https://vercel.com/support

2. **域名服务商帮助**
   - **Spaceship**：https://www.spaceship.com/help/（你的域名服务商）
   - 阿里云：https://help.aliyun.com/product/29690.html
   - 腾讯云：https://cloud.tencent.com/document/product/302

3. **项目文档**
   - 详细部署指南：`VERCEL_CUSTOM_DOMAIN.md`
   - 国内部署指南：`FRONTEND_DEPLOY_GUIDE.md`

---

**配置完成后，你的网站就可以通过 `https://acgmbti.online` 访问了！** 🎉

如果遇到问题，告诉我你的域名服务商和具体错误信息，我可以帮你排查！

