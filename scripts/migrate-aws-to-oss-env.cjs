/**
 * 将 AWS_* 环境变量迁移到 OSS_* 环境变量
 * 用于从 AWS S3 迁移到阿里云 OSS
 */

const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '../backend/.env');

if (!fs.existsSync(envFile)) {
  console.error('❌ 找不到 .env 文件:', envFile);
  process.exit(1);
}

console.log('📋 开始迁移环境变量...');
console.log('='.repeat(60));

const content = fs.readFileSync(envFile, 'utf-8');
const lines = content.split('\n');

const mapping = {
  'AWS_ACCESS_KEY_ID': 'OSS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY': 'OSS_ACCESS_KEY_SECRET',
  'AWS_REGION': 'OSS_REGION',
  'AWS_S3_BUCKET': 'OSS_BUCKET',
  'AWS_S3_ENDPOINT': 'OSS_ENDPOINT',
  'AWS_S3_PUBLIC_URL': 'OSS_PUBLIC_BASE_URL',
};

let hasChanges = false;
const newLines = [];
const addedKeys = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // 跳过空行和注释
  if (!trimmed || trimmed.startsWith('#')) {
    newLines.push(line);
    continue;
  }
  
  // 检查是否是 AWS_* 变量
  let found = false;
  for (const [awsKey, ossKey] of Object.entries(mapping)) {
    if (trimmed.startsWith(`${awsKey}=`)) {
      // 提取值
      const value = trimmed.substring(awsKey.length + 1);
      
      // 检查是否已经有对应的 OSS_* 变量
      const hasOssVar = lines.some(l => l.trim().startsWith(`${ossKey}=`));
      
      if (!hasOssVar) {
        // 添加 OSS_* 变量（在 AWS_* 变量之后）
        newLines.push(line); // 保留原 AWS_* 变量（兼容性）
        newLines.push(`# 已迁移到 OSS_*，保留 AWS_* 以兼容旧代码`);
        newLines.push(`${ossKey}=${value}`);
        addedKeys.add(ossKey);
        hasChanges = true;
        console.log(`✅ ${awsKey} -> ${ossKey}`);
      } else {
        // 已经有 OSS_* 变量，只保留 AWS_* 作为注释
        newLines.push(`# ${line} # 已迁移到 ${ossKey}，保留作为兼容`);
        console.log(`⚠️  ${ossKey} 已存在，跳过 ${awsKey}`);
      }
      found = true;
      break;
    }
  }
  
  if (!found) {
    newLines.push(line);
  }
}

if (hasChanges) {
  // 备份原文件
  const backupFile = `${envFile}.backup.${Date.now()}`;
  fs.copyFileSync(envFile, backupFile);
  console.log(`\n💾 已备份原文件到: ${backupFile}`);
  
  // 写入新内容
  fs.writeFileSync(envFile, newLines.join('\n'), 'utf-8');
  
  console.log('\n✅ 迁移完成！');
  console.log('='.repeat(60));
  console.log('📝 已添加以下 OSS_* 环境变量:');
  addedKeys.forEach(key => console.log(`   - ${key}`));
  console.log('\n💡 提示:');
  console.log('   1. 已保留 AWS_* 变量以兼容旧代码');
  console.log('   2. 现在系统会优先使用 OSS_* 变量');
  console.log('   3. 请重启后端服务使配置生效');
  console.log('   4. 确认 OSS 正常工作后，可以删除 AWS_* 变量');
} else {
  console.log('\n⚠️  没有需要迁移的变量');
  console.log('   可能已经迁移过了，或者没有找到 AWS_* 变量');
}

