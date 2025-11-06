/**
 * S3 访问诊断脚本
 * 用于诊断为什么已添加 AmazonS3FullAccess 但仍然无法访问存储桶
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取环境变量文件
function loadEnvFile(filePath) {
  const envVars = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
        }
      }
    });
  }
  return envVars;
}

// 加载环境变量
const envPath = path.join(__dirname, '../backend/.env');
const envVars = loadEnvFile(envPath);

// 将环境变量设置到 process.env
for (const [key, value] of Object.entries(envVars)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

console.log('🔍 S3 访问诊断工具\n');
console.log('='.repeat(60));
console.log('');

// 获取环境变量
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

// 检查环境变量
console.log('📋 步骤 1：检查环境变量配置\n');

const envVars = {
  'AWS_ACCESS_KEY_ID': accessKeyId,
  'AWS_SECRET_ACCESS_KEY': secretAccessKey,
  'AWS_REGION': region,
  'AWS_S3_BUCKET': bucket,
};

let envConfigOk = true;
for (const [key, value] of Object.entries(envVars)) {
  if (!value || value === 'your-aws-access-key' || value === 'your-aws-secret-key' || value === 'your-s3-bucket-name') {
    console.log(`❌ ${key}: 未配置或使用默认值`);
    envConfigOk = false;
  } else {
    const displayValue = key.includes('SECRET') || key.includes('KEY')
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
}

if (!envConfigOk) {
  console.log('\n❌ 环境变量配置不完整，请先配置环境变量！');
  process.exit(1);
}

console.log('\n✅ 环境变量配置完整\n');

// 配置 AWS SDK
AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: 'v4',
});

const s3 = new AWS.S3({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: 'v4',
});

// 测试 1: 列出存储桶（需要 s3:ListBucket 权限）
console.log('📋 步骤 2：测试存储桶访问（headBucket 操作）\n');
console.log(`   存储桶: ${bucket}`);
console.log(`   区域: ${region}\n`);

try {
  await s3.headBucket({ Bucket: bucket }).promise();
  console.log('✅ 可以访问存储桶（headBucket 成功）\n');
} catch (error) {
  console.log(`❌ 无法访问存储桶: ${error.message} (${error.code})\n`);
  
  // 分析错误原因
  console.log('🔍 错误分析：\n');
  
  if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
    console.log('   可能原因：');
    console.log('   1. ❌ 存储桶策略（Bucket Policy）中有 Deny 规则（最常见！）');
    console.log('   2. ❌ 存储桶的阻止公共访问设置过于严格');
    console.log('   3. ❌ 区域不匹配（后端 AWS_REGION 与存储桶实际区域不一致）');
    console.log('   4. ❌ 存储桶名称不匹配（大小写敏感）');
    console.log('   5. ❌ 访问密钥不属于有权限的 IAM 用户');
    console.log('   6. ❌ IAM 用户和存储桶不在同一个 AWS 账户');
    console.log('\n   📖 详细排查指南：已添加AmazonS3FullAccess但仍失败排查.md\n');
  } else if (error.code === 'NotFound' || error.code === 'NoSuchBucket') {
    console.log('   可能原因：');
    console.log('   1. ❌ 存储桶不存在');
    console.log('   2. ❌ 存储桶名称错误');
    console.log('   3. ❌ 区域不匹配（存储桶在其他区域）');
    console.log('\n   💡 建议：');
    console.log('   1. 在 S3 控制台确认存储桶名称和区域');
    console.log('   2. 确保后端 AWS_REGION 与存储桶实际区域一致\n');
  } else if (error.code === 'InvalidAccessKeyId') {
    console.log('   可能原因：');
    console.log('   1. ❌ 访问密钥 ID 错误');
    console.log('   2. ❌ 访问密钥已被删除或禁用');
    console.log('\n   💡 建议：');
    console.log('   1. 在 IAM 控制台检查访问密钥状态');
    console.log('   2. 确认访问密钥属于正确的 IAM 用户\n');
  } else {
    console.log(`   未知错误: ${error.code}`);
    console.log(`   错误信息: ${error.message}\n`);
  }
}

// 测试 2: 生成预签名 URL（只需要签名权限）
console.log('📋 步骤 3：测试预签名 URL 生成\n');

try {
  const testUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: bucket,
    Key: 'test/test.txt',
    ContentType: 'text/plain',
    Expires: 60,
  });
  console.log('✅ 可以生成预签名 URL');
  console.log(`   URL 长度: ${testUrl.length} 字符\n`);
  
  console.log('💡 重要提示：');
  console.log('   即使 headBucket 失败，只要预签名 URL 生成成功，');
  console.log('   上传功能仍然可以正常工作！\n');
} catch (error) {
  console.log(`❌ 无法生成预签名 URL: ${error.message} (${error.code})\n`);
  
  console.log('🔍 错误分析：\n');
  console.log('   可能原因：');
  console.log('   1. ❌ 访问密钥错误或无效');
  console.log('   2. ❌ 区域配置错误');
  console.log('   3. ❌ AWS SDK 配置问题');
  console.log('\n   💡 建议：');
  console.log('   1. 检查访问密钥是否正确');
  console.log('   2. 检查区域配置是否与存储桶一致\n');
}

// 测试 3: 列出存储桶中的对象（需要 s3:ListBucket 权限）
console.log('📋 步骤 4：测试列出存储桶中的对象（listObjects 操作）\n');

try {
  const result = await s3.listObjectsV2({ Bucket: bucket, MaxKeys: 1 }).promise();
  console.log('✅ 可以列出存储桶中的对象');
  console.log(`   对象数量: ${result.KeyCount || 0}\n`);
} catch (error) {
  console.log(`❌ 无法列出存储桶中的对象: ${error.message} (${error.code})\n`);
  
  if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
    console.log('   这说明 IAM 用户缺少 s3:ListBucket 权限，或者存储桶策略阻止了访问。\n');
  }
}

// 总结
console.log('='.repeat(60));
console.log('📝 诊断总结\n');

console.log('如果 headBucket 失败但预签名 URL 生成成功：');
console.log('   ✅ 上传功能应该可以正常工作');
console.log('   ⚠️  但诊断工具会显示"无法访问存储桶"');
console.log('   💡 可以暂时忽略此错误，或按照排查指南修复\n');

console.log('如果预签名 URL 生成也失败：');
console.log('   ❌ 上传功能无法正常工作');
console.log('   💡 必须修复权限或配置问题\n');

console.log('📖 详细排查指南：已添加AmazonS3FullAccess但仍失败排查.md\n');

