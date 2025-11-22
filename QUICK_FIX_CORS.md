# 🚀 快速修复 CORS 403 错误

## 问题
OSS 控制台没有 OPTIONS 方法选项，导致浏览器预检请求失败，出现 403 错误。

## ✅ 解决方案：使用 ossutil 命令行工具

### 方法 1：使用提供的脚本（推荐）

#### Windows (PowerShell)
```powershell
# 1. 确保已下载并配置 ossutil
#    下载地址: https://help.aliyun.com/document_detail/120075.html
#    运行: ossutil config 进行配置

# 2. 运行脚本
.\scripts\apply-cors-config.ps1
```

#### Mac/Linux
```bash
# 1. 确保已下载并配置 ossutil
#    下载地址: https://help.aliyun.com/document_detail/120075.html
#    运行: ossutil config 进行配置

# 2. 添加执行权限
chmod +x scripts/apply-cors-config.sh

# 3. 运行脚本
./scripts/apply-cors-config.sh
```

### 方法 2：手动使用 ossutil

```bash
# 1. 配置 ossutil（如果还没配置）
ossutil config

# 2. 应用 CORS 配置
ossutil cors --method put oss://xhs-content cors-config.xml
```

### 验证修复

```bash
# 运行诊断脚本
node scripts/deep-diagnose-oss.cjs
```

应该看到：
- ✅ CORS 预检请求测试通过
- ✅ 不再有 "缺少 OPTIONS 方法" 的错误

---

## 📝 详细说明

完整修复指南请查看：`OSS_CORS_FIX_GUIDE.md`

---

## 🔍 如果仍然失败

1. **确认 ossutil 已正确配置**：
   ```bash
   ossutil ls oss://xhs-content
   ```

2. **查看当前 CORS 配置**：
   ```bash
   ossutil cors --method get oss://xhs-content
   ```

3. **检查浏览器控制台**：
   - 打开 F12 开发者工具
   - 查看 Network 标签
   - 检查 OPTIONS 请求的响应头

