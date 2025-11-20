/**
 * 迁移环境变量脚本：将 AWS_* 变量迁移为 OSS_* 格式
 * 此脚本会检查 backend/.env 和根目录 .env 文件，并将所有 AWS_* 开头的变量替换为对应的 OSS_* 变量
 */

const fs = require('fs');
const path = require('path');

const envPaths = [
  path.resolve(__dirname, '../backend/.env'),
  path.resolve(__dirname, '../.env'),
];

// AWS_* 到 OSS_* 的映射
const envVarMapping = {
  'AWS_ACCESS_KEY_ID': 'OSS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY': 'OSS_ACCESS_KEY_SECRET',
  'AWS_REGION': 'OSS_REGION',
  'AWS_S3_BUCKET': 'OSS_BUCKET',
  'AWS_S3_ENDPOINT': 'OSS_ENDPOINT',
};

function migrateEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return false;
  }

  const relativePath = path.relative(process.cwd(), envPath);
  console.log(`\n📋 检查 ${relativePath} 文件...`);

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];
  const awsVars = [];
  const ossVars = [];
  let hasChanges = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 跳过空行和注释
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      newLines.push(line);
      continue;
    }

    // 检查是否是 AWS_* 变量
    let matched = false;
    for (const [awsVar, ossVar] of Object.entries(envVarMapping)) {
      if (trimmedLine.startsWith(awsVar + '=') || trimmedLine.startsWith(awsVar + ' =')) {
        // 提取值
        const match = line.match(/^(\s*)([^=]+)\s*=\s*(.+)$/);
        if (match) {
          const indent = match[1];
          const value = match[3];
          
          // 检查是否已经有对应的 OSS_* 变量
          const hasOssVar = lines.some(l => {
            const trimmed = l.trim();
            return trimmed.startsWith(ossVar + '=') || trimmed.startsWith(ossVar + ' =');
          });

          if (hasOssVar) {
            console.log(`⚠️  发现 ${awsVar}，但已存在 ${ossVar}，将跳过 ${awsVar}`);
            // 跳过这个 AWS_* 变量（不添加到新内容中）
            awsVars.push(awsVar);
            matched = true;
            hasChanges = true;
            break;
          } else {
            // 替换为 OSS_* 变量
            newLines.push(`${indent}${ossVar}=${value}`);
            console.log(`✅ 将 ${awsVar} 替换为 ${ossVar}`);
            awsVars.push(awsVar);
            ossVars.push(ossVar);
            matched = true;
            hasChanges = true;
            break;
          }
        }
      }
    }

    if (!matched) {
      // 检查是否是 OSS_* 变量（用于统计）
      for (const ossVar of Object.values(envVarMapping)) {
        if (trimmedLine.startsWith(ossVar + '=') || trimmedLine.startsWith(ossVar + ' =')) {
          ossVars.push(ossVar);
          break;
        }
      }
      newLines.push(line);
    }
  }

  console.log('\n📊 统计信息：');
  console.log(`   - 发现的 AWS_* 变量: ${awsVars.length > 0 ? awsVars.join(', ') : '无'}`);
  console.log(`   - 现有的 OSS_* 变量: ${[...new Set(ossVars)].length > 0 ? [...new Set(ossVars)].join(', ') : '无'}`);

  if (!hasChanges) {
    console.log('✅ 无需迁移，所有变量都已经是 OSS_* 格式');
    return true;
  }

  // 备份原文件
  const backupPath = envPath + '.backup.' + Date.now();
  fs.writeFileSync(backupPath, content, 'utf-8');
  console.log(`💾 已创建备份文件: ${path.basename(backupPath)}`);

  // 写入新内容
  fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8');
  console.log(`✅ 已更新 ${relativePath} 文件`);
  console.log('⚠️  请检查更新后的文件，确保配置正确！');
  return true;
}

// 主函数
function main() {
  console.log('🔄 开始检查环境变量迁移...\n');
  
  let foundAny = false;
  for (const envPath of envPaths) {
    if (migrateEnvFile(envPath)) {
      foundAny = true;
    }
  }

  if (!foundAny) {
    console.log('\n❌ 未找到任何 .env 文件');
    console.log('   检查路径:');
    envPaths.forEach(p => console.log(`   - ${p}`));
    process.exit(1);
  }

  console.log('\n✅ 环境变量检查完成！');
}

main();

