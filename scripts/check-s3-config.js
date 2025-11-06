/**
 * 检查 S3 配置脚本
 * 用于诊断为什么系统仍在使用 Base64 而不是 S3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 检查 S3 配置...\n');

// 检查本地 .env 文件
const envPath = path.join(__dirname, '../backend/.env');
const envExamplePath = path.join(__dirname, '../backend/env.example');

console.log('📁 检查本地环境变量文件...');
if (fs.existsSync(envPath)) {
  console.log('✅ 找到 .env 文件');
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  console.log('\n📋 检查 AWS S3 环境变量：\n');
  
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET'
  ];
  
  let allConfigured = true;
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value !== 'your-aws-access-key' && value !== 'your-aws-secret-key' && value !== 'your-s3-bucket-name') {
      const displayValue = varName.includes('SECRET') || varName.includes('KEY')
        ? `${value.substring(0, 8)}...` 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`❌ ${varName}: 未配置或使用默认值`);
      allConfigured = false;
    }
  });
  
  if (allConfigured) {
    console.log('\n✅ 本地 .env 文件配置完整！');
    console.log('   提示：如果后端服务正在运行，请重启服务以使环境变量生效。\n');
  } else {
    console.log('\n❌ 本地 .env 文件配置不完整！');
    console.log('   请按照以下步骤配置：\n');
    console.log('   1. 打开 backend/.env 文件');
    console.log('   2. 配置以下环境变量：');
    requiredVars.forEach(varName => {
      if (!envVars[varName] || envVars[varName] === 'your-aws-access-key' || envVars[varName] === 'your-aws-secret-key' || envVars[varName] === 'your-s3-bucket-name') {
        console.log(`      ${varName}=你的实际值`);
      }
    });
    console.log('   3. 保存文件后重启后端服务\n');
  }
  
} else {
  console.log('❌ 未找到 .env 文件');
  console.log('   请按照以下步骤创建：\n');
  console.log('   1. 复制 env.example 文件：');
  console.log('      cp backend/env.example backend/.env');
  console.log('   2. 编辑 backend/.env 文件，配置 AWS S3 环境变量');
  console.log('   3. 保存文件后重启后端服务\n');
}

// 检查 Railway 配置提示
console.log('🌐 Railway 生产环境配置：\n');
console.log('   如果应用部署在 Railway 上，需要：');
console.log('   1. 登录 Railway 控制台：https://railway.app');
console.log('   2. 选择你的后端服务');
console.log('   3. 进入 "Variables" 标签');
console.log('   4. 添加以下环境变量：');
console.log('      - AWS_ACCESS_KEY_ID');
console.log('      - AWS_SECRET_ACCESS_KEY');
console.log('      - AWS_REGION');
console.log('      - AWS_S3_BUCKET');
console.log('   5. 保存后 Railway 会自动重新部署\n');

// 检查后端服务是否运行
console.log('💡 诊断提示：\n');
console.log('   如果环境变量已配置但仍使用 Base64：');
console.log('   1. 确保后端服务已重启（环境变量只在启动时加载）');
console.log('   2. 检查后端日志，应该看到 S3 初始化信息，而不是警告信息');
console.log('   3. 运行验证脚本：node scripts/verify-s3-upload.js\n');
