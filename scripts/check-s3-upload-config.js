/**
 * S3 上传配置检查脚本
 * 用于检查：
 * 1. 存储桶策略是否允许 PUT 操作
 * 2. Content-Type 一致性
 * 3. 请求头配置
 */

const AWS = require('aws-sdk');
require('dotenv').config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!accessKeyId || !secretAccessKey || !region || !bucket) {
  console.error('❌ 请先配置 AWS 环境变量：');
  console.error('   - AWS_ACCESS_KEY_ID');
  console.error('   - AWS_SECRET_ACCESS_KEY');
  console.error('   - AWS_REGION');
  console.error('   - AWS_S3_BUCKET');
  process.exit(1);
}

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

async function checkBucketPolicy() {
  console.log('\n📋 检查 2: 存储桶策略是否允许 PUT 操作\n');
  
  try {
    // 获取存储桶策略
    const policyData = await s3.getBucketPolicy({ Bucket: bucket }).promise();
    const policy = JSON.parse(policyData.Policy);
    
    console.log('✅ 存储桶策略已配置');
    console.log('\n📄 策略内容:');
    console.log(JSON.stringify(policy, null, 2));
    
    // 检查是否有允许 PUT 操作的策略
    const statements = policy.Statement || [];
    let hasPutPermission = false;
    
    statements.forEach((statement, index) => {
      const actions = Array.isArray(statement.Action) 
        ? statement.Action 
        : [statement.Action];
      
      const hasPutObject = actions.some(action => 
        action === 's3:PutObject' || 
        action === 's3:PutObject*' ||
        action === 's3:*'
      );
      
      if (hasPutObject) {
        hasPutPermission = true;
        console.log(`\n✅ 策略语句 ${index + 1} 允许 PUT 操作:`);
        console.log(`   Action: ${JSON.stringify(actions)}`);
        console.log(`   Effect: ${statement.Effect}`);
        console.log(`   Principal: ${JSON.stringify(statement.Principal)}`);
        console.log(`   Resource: ${JSON.stringify(statement.Resource)}`);
      }
    });
    
    if (!hasPutPermission) {
      console.log('\n⚠️  警告: 存储桶策略中未找到明确的 s3:PutObject 权限');
      console.log('   但这可能不是问题，因为 IAM 用户权限可能已经足够');
    }
    
  } catch (error) {
    if (error.code === 'NoSuchBucketPolicy') {
      console.log('ℹ️  存储桶没有配置策略（这是正常的）');
      console.log('   如果 IAM 用户有 s3:PutObject 权限，仍然可以上传');
    } else if (error.code === 'AccessDenied') {
      console.log('⚠️  无法读取存储桶策略（权限不足）');
      console.log('   这通常不是问题，只要 IAM 用户有 s3:PutObject 权限即可');
    } else {
      console.error('❌ 检查存储桶策略时出错:', error.message);
    }
  }
}

async function checkContentTypeConsistency() {
  console.log('\n📋 检查 3: Content-Type 一致性\n');
  
  const testCases = [
    { filename: 'test.jpg', contentType: 'image/jpeg' },
    { filename: 'test.png', contentType: 'image/png' },
    { filename: 'test.gif', contentType: 'image/gif' },
    { filename: 'test.webp', contentType: 'image/webp' },
  ];
  
  console.log('🧪 测试不同 Content-Type 的预签名 URL 生成:\n');
  
  for (const testCase of testCases) {
    try {
      const presignedUrl = await s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: `test/${testCase.filename}`,
        ContentType: testCase.contentType,
        Expires: 60,
      });
      
      // 解析 URL 检查 Content-Type 参数
      const urlObj = new URL(presignedUrl);
      const urlContentType = urlObj.searchParams.get('Content-Type');
      
      const match = urlContentType === testCase.contentType;
      const status = match ? '✅' : '❌';
      
      console.log(`${status} ${testCase.filename}:`);
      console.log(`   期望: ${testCase.contentType}`);
      console.log(`   实际: ${urlContentType || '未找到'}`);
      console.log(`   匹配: ${match ? '是' : '否'}`);
      
      if (!match) {
        console.log(`   ⚠️  警告: Content-Type 不匹配！`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.filename}: ${error.message}`);
    }
  }
  
  console.log('\n💡 提示:');
  console.log('   前端上传时必须使用与生成预签名 URL 时完全相同的 Content-Type');
  console.log('   检查前端代码: file.type === urlParams["Content-Type"]');
}

async function checkRequestHeaders() {
  console.log('\n📋 检查 4: 请求头配置\n');
  
  console.log('✅ 前端代码检查（基于代码审查）:');
  console.log('   1. 只设置了 Content-Type 请求头');
  console.log('   2. 使用 credentials: "omit" 避免添加额外的请求头');
  console.log('   3. 没有使用 axios 拦截器（直接使用 fetch）');
  
  console.log('\n📝 前端上传代码示例:');
  console.log(`
    const requestHeaders: HeadersInit = {
      'Content-Type': file.type,  // ✅ 只设置 Content-Type
    };
    
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: requestHeaders,
      credentials: 'omit',  // ✅ 不发送 credentials
    });
  `);
  
  console.log('\n⚠️  需要避免的常见错误:');
  console.log('   ❌ 不要添加 Authorization 头（预签名 URL 已包含签名）');
  console.log('   ❌ 不要添加 x-amz-* 头（这些由 AWS SDK 自动处理）');
  console.log('   ❌ 不要使用 axios（可能自动添加请求头）');
  console.log('   ❌ 不要设置 credentials: "include"（可能添加 Cookie 头）');
}

async function main() {
  console.log('🔍 S3 上传配置检查工具\n');
  console.log('='.repeat(50));
  
  await checkBucketPolicy();
  await checkContentTypeConsistency();
  await checkRequestHeaders();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ 检查完成！');
  console.log('\n📚 参考文档:');
  console.log('   - AWS S3 预签名 URL: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html');
  console.log('   - 存储桶策略: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html');
}

main().catch(console.error);

