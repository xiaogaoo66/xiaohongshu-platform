# 阿里云 OSS + CDN 详细配置指南

## 📋 配置清单

完成本指南后，你将拥有：
- ✅ OSS 存储桶配置完成
- ✅ 静态网站托管已启用
- ✅ CDN 加速已配置
- ✅ 后端 CORS 已更新
- ✅ 前端可以正常访问

---

## 第一部分：OSS 存储桶配置

### 步骤 1：登录阿里云控制台

1. 访问：https://www.aliyun.com/
2. 登录你的阿里云账号
3. 进入 **对象存储 OSS** 控制台：https://oss.console.aliyun.com/

### 步骤 2：创建存储桶（Bucket）

1. 点击 **"Bucket 列表"** → **"创建 Bucket"**

2. **配置参数**（重要）：
   ```
   Bucket 名称：xiaohongshu-frontend-xxxxx
   （说明：名称必须全局唯一，建议加上你的标识符）
   
   地域：选择离你最近的地域
   （推荐：华东1-杭州、华东2-上海、华北2-北京）
   
   存储类型：标准存储
   
   读写权限：公共读
   （说明：前端需要公开访问，必须选择公共读）
   
   同城冗余存储：关闭
   
   版本控制：关闭
   
   服务器端加密：关闭
   
   实时日志查询：开启（可选，方便调试）
   ```

3. 点击 **"确定"** 创建

4. **记录你的 Bucket 信息**：
   ```
   Bucket 名称：____________________
   地域：____________________
   OSS 域名：____________________
   ```

### 步骤 3：配置静态网站托管

1. 在 Bucket 列表中，点击你的 Bucket 名称进入

2. 左侧菜单 → **"基础设置"** → **"静态网站托管"**

3. 点击 **"设置"** 按钮

4. **配置参数**：
   ```
   状态：开启
   
   默认首页：index.html
   
   默认 404 页：index.html
   （说明：设置 404 页为 index.html 是为了支持 React Router 的前端路由）
   
   子目录首页：留空
   
   HTTP 重定向：关闭
   ```

5. 点击 **"保存"**

6. **获取访问地址**：
   - 在静态网站托管页面，你会看到：
   ```
   访问端点：http://你的bucket名称.oss-cn-地域.aliyuncs.com
   ```
   - **记录这个地址**，稍后测试用

### 步骤 4：配置跨域规则（CORS）

1. 左侧菜单 → **"权限管理"** → **"跨域设置"**

2. 点击 **"创建规则"**

3. **配置参数**：
   ```
   来源：*
   （说明：如果是 CDN 域名，可以填写具体域名）
   
   允许 Methods：GET, HEAD
   
   允许 Headers：*
   
   暴露 Headers：ETag, x-oss-request-id
   
   缓存时间：0
   ```

4. 点击 **"确定"**

---

## 第二部分：上传前端文件到 OSS

### 方法 1：使用阿里云控制台上传（最简单）

1. **本地构建前端**：
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **上传文件**：
   - 在 OSS 控制台，进入你的 Bucket
   - 点击 **"文件管理"** → **"上传文件"**
   - 点击 **"选择文件"** 或直接拖拽
   - 选择 `frontend/dist` 目录下的**所有文件**：
     - `index.html`
     - `assets/` 文件夹（包含所有 JS、CSS 文件）
     - 其他静态资源文件
   - **重要**：不要上传 `dist` 文件夹本身，只上传文件夹内的内容
   - 点击 **"上传"**

3. **验证上传**：
   - 在文件管理页面，应该能看到：
     - `index.html` 在根目录
     - `assets/` 文件夹包含构建后的文件

### 方法 2：使用 ossutil 命令行工具（推荐）

1. **安装 ossutil**：
   - 下载：https://help.aliyun.com/document_detail/120075.html
   - 或使用包管理器：
     ```bash
     # Windows (使用 Chocolatey)
     choco install ossutil
     
     # Mac (使用 Homebrew)
     brew install ossutil
     ```

2. **配置 ossutil**：
   ```bash
   ossutil config
   ```
   输入以下信息：
   ```
   请输入配置文件路径：直接回车（使用默认路径）
   请输入 endpoint：oss-cn-hangzhou.aliyuncs.com（根据你的地域修改）
   请输入 accessKeyId：你的 AccessKey ID
   请输入 accessKeySecret：你的 AccessKey Secret
   请输入 stsToken：直接回车（不使用 STS）
   ```

3. **获取 AccessKey**（如果还没有）：
   - 访问：https://ram.console.aliyun.com/manage/ak
   - 点击 **"创建 AccessKey"**
   - **重要**：保存好 AccessKey ID 和 Secret，只显示一次

4. **上传文件**：
   ```bash
   cd frontend
   
   # 上传 dist 目录所有内容到 OSS
   ossutil cp -r dist/ oss://你的bucket名称/ --update
   
   # 例如：
   # ossutil cp -r dist/ oss://xiaohongshu-frontend-xxxxx/ --update
   ```

5. **验证上传**：
   ```bash
   # 列出 OSS 中的文件
   ossutil ls oss://你的bucket名称/
   ```

### 方法 3：使用 OSS Browser（图形化工具）

1. **下载 OSS Browser**：
   - 访问：https://help.aliyun.com/document_detail/61872.html
   - 下载对应系统的版本

2. **登录配置**：
   - 打开 OSS Browser
   - 使用阿里云账号登录
   - 选择你的 Bucket

3. **上传文件**：
   - 在本地文件管理器中，进入 `frontend/dist` 目录
   - 选择所有文件（`index.html` 和 `assets` 文件夹）
   - 拖拽到 OSS Browser 窗口
   - 等待上传完成

---

## 第三部分：CDN 加速配置（可选但强烈推荐）

### 步骤 1：添加 CDN 域名

1. 登录阿里云 CDN 控制台：https://cdn.console.aliyun.com/

2. 点击 **"域名管理"** → **"添加域名"**

3. **配置参数**：
   ```
   加速域名：frontend.yourdomain.com
   （说明：如果你有备案域名，使用子域名；如果没有，可以使用临时测试域名）
   
   业务类型：全站加速
   （说明：全站加速适合动态和静态混合内容）
   
   源站信息：
   - 源站类型：OSS 域名
   - 回源 Host：选择你的 OSS Bucket
   - 源站地址：选择你的 OSS Bucket
   
   加速区域：全部区域
   ```

4. 点击 **"下一步"**

5. **配置协议**：
   ```
   HTTP：开启
   HTTPS：开启（推荐）
   
   如果选择 HTTPS：
   - 证书来源：选择"阿里云证书服务"（免费证书）
   - 或上传你自己的 SSL 证书
   
   HTTP 强制跳转 HTTPS：开启（推荐）
   ```

6. 点击 **"提交"**

7. **等待审核**：
   - 新添加的域名需要审核，通常几分钟到几小时
   - 审核通过后，会分配 CNAME 地址

### 步骤 2：配置 DNS 解析

1. 登录阿里云 DNS 控制台：https://dns.console.aliyun.com/

2. 找到你的域名，点击 **"解析设置"**

3. 点击 **"添加记录"**

4. **配置解析**：
   ```
   记录类型：CNAME
   
   主机记录：frontend（对应 frontend.yourdomain.com）
   
   解析线路：默认
   
   记录值：从 CDN 控制台复制的 CNAME 地址
   （例如：frontend.yourdomain.com.w.kunlunea.com）
   
   TTL：10 分钟
   ```

5. 点击 **"确定"**

6. **等待生效**：
   - DNS 解析通常几分钟内生效
   - 可以使用 `ping frontend.yourdomain.com` 检查是否生效

### 步骤 3：配置 CDN 缓存策略

1. 在 CDN 控制台，选择你的域名

2. 点击 **"缓存配置"** → **"缓存规则"**

3. **添加缓存规则**：

   **规则 1：HTML 文件不缓存**
   ```
   规则名称：HTML 不缓存
   匹配类型：文件后缀
   匹配内容：html
   缓存时间：0 秒
   优先级：1
   ```

   **规则 2：静态资源长期缓存**
   ```
   规则名称：静态资源缓存
   匹配类型：文件后缀
   匹配内容：js,css,png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot
   缓存时间：31536000 秒（1年）
   优先级：2
   ```

   **规则 3：默认缓存**
   ```
   规则名称：默认缓存
   匹配类型：全部文件
   匹配内容：全部
   缓存时间：86400 秒（1天）
   优先级：3
   ```

4. 点击 **"确定"** 保存每个规则

### 步骤 4：配置 HTTPS（推荐）

1. 在 CDN 控制台，选择你的域名

2. 点击 **"HTTPS 配置"**

3. **配置 HTTPS**：
   ```
   HTTPS 安全加速：开启
   
   证书来源：
   - 选择"阿里云证书服务"（免费证书）
   - 或上传你自己的 SSL 证书
   
   HTTP 强制跳转 HTTPS：开启
   （说明：所有 HTTP 请求自动跳转到 HTTPS）
   
   HSTS：开启（可选）
   ```

4. 点击 **"确定"**

### 步骤 5：配置页面优化（可选）

1. 点击 **"页面优化"**

2. **开启优化**：
   ```
   智能压缩：开启
   （说明：自动压缩 JS、CSS、HTML 文件）
   
   页面压缩：开启
   
   移除 HTML 注释：开启（可选）
   ```

3. 点击 **"确定"**

---

## 第四部分：更新后端 CORS 配置

### 步骤 1：获取前端域名

记录你的前端访问地址：
```
OSS 直接访问：http://你的bucket名称.oss-cn-地域.aliyuncs.com
CDN 访问（如果配置了）：https://frontend.yourdomain.com
```

### 步骤 2：更新后端环境变量

1. 在 Railway 控制台（或你的后端部署平台）

2. 找到后端服务，进入 **"Variables"** 标签

3. 添加或更新环境变量：
   ```
   FRONTEND_URL=https://frontend.yourdomain.com
   ```
   或者如果使用 OSS 直接访问：
   ```
   FRONTEND_URL=http://你的bucket名称.oss-cn-地域.aliyuncs.com
   ```
   
   如果同时有多个前端域名，使用逗号分隔：
   ```
   FRONTEND_URL=https://frontend.yourdomain.com,http://你的bucket名称.oss-cn-地域.aliyuncs.com
   ```

4. **重新部署后端服务**（使环境变量生效）

### 步骤 3：验证后端 CORS 配置

后端代码（`backend/src/main.ts`）已经支持从环境变量读取：
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
});
```

如果设置了 `FRONTEND_URL`，后端会只允许该域名访问；如果未设置，会允许所有来源（开发环境）。

---

## 第五部分：测试和验证

### 测试 1：访问 OSS 直接地址

1. 在浏览器中访问：
   ```
   http://你的bucket名称.oss-cn-地域.aliyuncs.com
   ```

2. **预期结果**：
   - ✅ 页面正常加载
   - ✅ 没有 404 错误
   - ✅ 样式和脚本正常加载

### 测试 2：访问 CDN 地址（如果配置了）

1. 在浏览器中访问：
   ```
   https://frontend.yourdomain.com
   ```

2. **预期结果**：
   - ✅ 自动跳转到 HTTPS（如果配置了）
   - ✅ 页面正常加载
   - ✅ 加载速度更快（CDN 加速）

### 测试 3：测试前端路由

1. 访问前端首页，然后点击导航到其他页面

2. 在地址栏直接输入路由地址，例如：
   ```
   https://frontend.yourdomain.com/login
   ```

3. **预期结果**：
   - ✅ 不会出现 404 错误
   - ✅ 页面正常显示（因为 OSS 配置了 404 页为 index.html）

### 测试 4：测试 API 请求

1. 打开浏览器开发者工具（F12）

2. 切换到 **"Network"** 标签

3. 在前端页面执行登录操作

4. **检查 API 请求**：
   - ✅ 请求 URL 应该是：`https://xiaohongshu-platform-production.up.railway.app/...`
   - ✅ 响应状态码应该是 200
   - ✅ 不应该出现 CORS 错误

5. **如果出现 CORS 错误**：
   - 检查后端环境变量 `FRONTEND_URL` 是否正确设置
   - 检查前端域名是否在后端允许列表中
   - 重新部署后端服务

### 测试 5：检查资源加载

1. 在浏览器开发者工具 → **"Network"** 标签

2. 刷新页面

3. **检查资源加载**：
   - ✅ 所有 JS、CSS 文件正常加载
   - ✅ 图片资源正常加载
   - ✅ 没有 404 错误

---

## 第六部分：常见问题排查

### 问题 1：页面空白

**可能原因**：
- 文件路径错误
- `index.html` 中的资源路径不正确
- 浏览器缓存问题

**解决方案**：
1. 检查浏览器控制台错误信息
2. 确认 OSS 中的文件结构正确：
   ```
   index.html
   assets/
     ├── index-xxxxx.js
     ├── index-xxxxx.css
     └── ...
   ```
3. 清除浏览器缓存，强制刷新（Ctrl+Shift+R）

### 问题 2：刷新页面出现 404

**原因**：
- OSS 静态网站托管没有配置 404 页

**解决方案**：
1. 在 OSS 控制台 → 静态网站托管 → 设置默认 404 页为 `index.html`
2. 等待几分钟让配置生效
3. 重新测试

### 问题 3：CORS 错误

**错误信息**：
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**解决方案**：
1. 检查后端环境变量 `FRONTEND_URL` 是否正确设置
2. 确认前端域名（包括协议）与后端配置一致
3. 检查后端 CORS 配置代码
4. 重新部署后端服务

### 问题 4：CDN 缓存导致更新不及时

**解决方案**：
1. 在 CDN 控制台 → 刷新预热 → 刷新 URL
2. 输入需要刷新的 URL：
   ```
   https://frontend.yourdomain.com/index.html
   ```
3. 点击 **"提交"**
4. 等待几分钟，缓存清除后访问新内容

### 问题 5：HTTPS 证书问题

**错误信息**：
```
NET::ERR_CERT_AUTHORITY_INVALID
```

**解决方案**：
1. 检查 CDN 的 HTTPS 配置是否正确
2. 确认 SSL 证书已正确配置
3. 如果使用免费证书，等待证书生效（通常几分钟）
4. 检查 DNS 解析是否正确

---

## 第七部分：更新部署流程

每次更新前端代码后，需要重新部署：

### 1. 本地构建

```bash
cd frontend
npm run build
```

### 2. 上传到 OSS

**方法 1：使用控制台**
- 删除 OSS 中的旧文件（可选）
- 上传新的 `dist` 目录内容

**方法 2：使用脚本**
```bash
# 修改 deploy-oss.sh 或 deploy-oss.bat 中的 Bucket 名称
# 然后运行脚本
./deploy-oss.sh  # Linux/Mac
# 或
deploy-oss.bat   # Windows
```

**方法 3：使用 ossutil**
```bash
cd frontend
ossutil cp -r dist/ oss://你的bucket名称/ --update --force
```

### 3. 清除 CDN 缓存（如果配置了 CDN）

1. 在 CDN 控制台 → 刷新预热 → 刷新 URL
2. 输入：
   ```
   https://frontend.yourdomain.com/index.html
   ```
3. 点击 **"提交"**

### 4. 验证更新

访问前端地址，确认新内容已生效。

---

## 📊 配置检查清单

部署完成后，请确认：

- [ ] OSS Bucket 已创建，权限为公共读
- [ ] 静态网站托管已启用，默认页和 404 页都设置为 `index.html`
- [ ] CORS 规则已配置
- [ ] 前端文件已上传到 OSS
- [ ] OSS 直接访问地址可以正常访问
- [ ] CDN 域名已添加（如果使用）
- [ ] CDN 缓存策略已配置
- [ ] HTTPS 已配置（如果使用）
- [ ] DNS 解析已配置（如果使用自定义域名）
- [ ] 后端环境变量 `FRONTEND_URL` 已设置
- [ ] 后端服务已重新部署
- [ ] 前端页面可以正常访问
- [ ] 前端路由正常工作（刷新不 404）
- [ ] API 请求正常（无 CORS 错误）
- [ ] 所有功能测试通过

---

## 🎯 成本估算

### OSS 费用（按量计费）

- **存储费用**：约 ¥0.12/GB/月（标准存储）
- **流量费用**：
  - 中国大陆：¥0.50/GB
  - 海外：¥0.90/GB
- **请求费用**：¥0.01/万次（GET 请求）

**示例**（假设）：
- 存储：100MB，约 ¥0.01/月
- 流量：10GB/月，约 ¥5/月
- 请求：100万次/月，约 ¥1/月
- **总计：约 ¥6-10/月**

### CDN 费用（按量计费）

- **流量费用**：
  - 中国大陆：¥0.24/GB（0-10TB）
  - 海外：¥0.50-1.20/GB
- **HTTPS 请求费用**：¥0.01/万次

**示例**（假设）：
- 流量：10GB/月，约 ¥2.4/月
- HTTPS 请求：100万次/月，约 ¥1/月
- **总计：约 ¥3-5/月**

**合计：约 ¥10-15/月**（小规模应用）

---

## 📞 需要帮助？

如果遇到问题：
1. 查看阿里云控制台的错误日志
2. 检查浏览器控制台的错误信息
3. 验证所有配置步骤是否完成
4. 查看本指南的"常见问题排查"部分

---

**配置完成后，告诉我前端访问地址，我可以帮你测试！** 🚀
