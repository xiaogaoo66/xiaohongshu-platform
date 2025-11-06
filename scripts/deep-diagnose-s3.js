/**
 * 深度 S3 诊断工具
 * 用于诊断为什么 headBucket 失败但其他操作可能成功
 */

const fs = require('fs');
const path = require('path');

// 添加 backend/node_modules 到模块搜索路径
const backendNodeModules = path.join(__dirname, '../backend/node_modules');
if (!require.resolve.paths) {
  require.resolve.paths = function() { return []; };
}
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent) {
  if (request === 'aws-sdk') {
    const backendPath = path.join(backendNodeModules, 'aws-sdk');
    if (fs.existsSync(backendPath)) {
      return path.join(backendPath, 'index.js');
    }
  }
  return originalResolveFilename.apply(this, arguments);
};

const AWS = require('aws-sdk');

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

console.log('🔍 深度 S3 诊断工具\n');
console.log('='.repeat(70));
console.log('');

// 获取环境变量
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

// 检查环境变量
if (!accessKeyId || !secretAccessKey || !region || !bucket) {
  console.log('❌ 环境变量配置不完整！');
  process.exit(1);
}

console.log('📋 配置信息：');
console.log(`   访问密钥 ID: ${accessKeyId.substring(0, 8)}...`);
console.log(`   区域: ${region}`);
console.log(`   存储桶: ${bucket}\n`);

// 配置 AWS SDK
const s3 = new AWS.S3({
  accessKeyId,
  secretAccessKey,
  region,
  signatureVersion: 'v4',
});

// 存储测试结果
const results = {
  listBuckets: null,
  headBucket: null,
  listObjectsV2: null,
  headObject: null,
  putObject: null,
  getSignedUrl: null,
};

// 测试 1: 列出所有存储桶（测试访问密钥是否有效）
console.log('📋 测试 1：列出所有存储桶（listBuckets）\n');
console.log('   这个操作测试访问密钥是否有效，以及是否有基本的 S3 权限...\n');

try {
  const result = await s3.listBuckets().promise();
  results.listBuckets = { success: true, buckets: result.Buckets.map(b => b.Name) };
  console.log('   ✅ 成功！访问密钥有效');
  console.log(`   📦 你的账户中有 ${result.Buckets.length} 个存储桶：`);
  result.Buckets.forEach(b => {
    const marker = b.Name === bucket ? ' 👈 这是你配置的存储桶' : '';
    console.log(`      - ${b.Name}${marker}`);
  });
  
  // 检查配置的存储桶是否存在
  const bucketExists = result.Buckets.some(b => b.Name === bucket);
  if (!bucketExists) {
    console.log(`\n   ⚠️  警告：配置的存储桶 "${bucket}" 不在你的账户中！`);
    console.log('   可能原因：');
    console.log('   1. 存储桶名称错误');
    console.log('   2. 存储桶在其他 AWS 账户中');
    console.log('   3. 存储桶已被删除');
  }
} catch (error) {
  results.listBuckets = { success: false, error: error.message, code: error.code };
  console.log(`   ❌ 失败: ${error.message} (${error.code})`);
  console.log('\n   🔍 分析：');
  if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
    console.log('   - 访问密钥无效或错误');
    console.log('   - 请检查 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY');
  } else if (error.code === 'AccessDenied') {
    console.log('   - 访问密钥有效，但权限不足');
    console.log('   - IAM 用户可能没有基本的 S3 权限');
  }
}

console.log('\n' + '-'.repeat(70) + '\n');

// 测试 2: headBucket（这是诊断工具使用的操作）
console.log('📋 测试 2：检查存储桶访问（headBucket）\n');
console.log('   这是诊断工具使用的操作，需要 s3:HeadBucket 或 s3:ListBucket 权限...\n');

try {
  await s3.headBucket({ Bucket: bucket }).promise();
  results.headBucket = { success: true };
  console.log('   ✅ 成功！可以访问存储桶');
} catch (error) {
  results.headBucket = { success: false, error: error.message, code: error.code };
  console.log(`   ❌ 失败: ${error.message} (${error.code})`);
  console.log('\n   🔍 详细错误信息：');
  console.log(`   错误代码: ${error.code}`);
  console.log(`   错误消息: ${error.message}`);
  if (error.statusCode) {
    console.log(`   HTTP 状态码: ${error.statusCode}`);
  }
  if (error.region) {
    console.log(`   请求区域: ${error.region}`);
  }
  
  console.log('\n   💡 可能的原因：');
  if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
    console.log('   1. IAM 用户缺少 s3:HeadBucket 或 s3:ListBucket 权限');
    console.log('   2. 存储桶策略（Bucket Policy）中有 Deny 规则');
    console.log('   3. 存储桶的阻止公共访问设置阻止了 IAM 用户访问');
    console.log('   4. 区域不匹配（存储桶在其他区域）');
    console.log('   5. IAM 用户和存储桶不在同一个 AWS 账户');
  } else if (error.code === 'NotFound' || error.code === 'NoSuchBucket') {
    console.log('   1. 存储桶不存在');
    console.log('   2. 存储桶名称错误');
    console.log('   3. 存储桶在其他区域（需要指定正确的区域）');
  }
}

console.log('\n' + '-'.repeat(70) + '\n');

// 测试 3: listObjectsV2（列出存储桶中的对象）
console.log('📋 测试 3：列出存储桶中的对象（listObjectsV2）\n');
console.log('   这个操作需要 s3:ListBucket 权限...\n');

try {
  const result = await s3.listObjectsV2({ Bucket: bucket, MaxKeys: 5 }).promise();
  results.listObjectsV2 = { success: true, count: result.KeyCount || 0 };
  console.log('   ✅ 成功！可以列出存储桶中的对象');
  console.log(`   📁 存储桶中有 ${result.KeyCount || 0} 个对象（最多显示 5 个）`);
  if (result.Contents && result.Contents.length > 0) {
    result.Contents.forEach(obj => {
      console.log(`      - ${obj.Key} (${(obj.Size / 1024).toFixed(2)} KB)`);
    });
  }
} catch (error) {
  results.listObjectsV2 = { success: false, error: error.message, code: error.code };
  console.log(`   ❌ 失败: ${error.message} (${error.code})`);
  if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
    console.log('\n   💡 这说明 IAM 用户缺少 s3:ListBucket 权限');
  }
}

console.log('\n' + '-'.repeat(70) + '\n');

// 测试 4: 生成预签名 URL（这是实际使用的功能）
console.log('📋 测试 4：生成预签名 URL（getSignedUrlPromise）\n');
console.log('   这是实际上传功能使用的操作，只需要签名权限...\n');

try {
  const testUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: bucket,
    Key: 'test/diagnostic-test.txt',
    ContentType: 'text/plain',
    Expires: 60,
  });
  results.getSignedUrl = { success: true, urlLength: testUrl.length };
  console.log('   ✅ 成功！可以生成预签名 URL');
  console.log(`   🔗 URL 长度: ${testUrl.length} 字符`);
  console.log(`   📝 URL 预览: ${testUrl.substring(0, 100)}...`);
} catch (error) {
  results.getSignedUrl = { success: false, error: error.message, code: error.code };
  console.log(`   ❌ 失败: ${error.message} (${error.code})`);
  console.log('\n   💡 如果这个操作失败，上传功能将无法正常工作！');
}

console.log('\n' + '-'.repeat(70) + '\n');

// 测试 5: 尝试实际上传一个测试文件（使用预签名 URL）
console.log('📋 测试 5：测试实际上传（使用预签名 URL）\n');
console.log('   这个测试会生成一个预签名 URL，然后尝试上传一个测试文件...\n');

try {
  // 生成预签名 URL
  const uploadUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: bucket,
    Key: `diagnostic-test-${Date.now()}.txt`,
    ContentType: 'text/plain',
    Expires: 300,
  });
  
  // 尝试上传
  const testContent = 'This is a diagnostic test file. You can delete it.';
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: testContent,
  });
  
  if (response.ok) {
    results.putObject = { success: true };
    console.log('   ✅ 成功！可以上传文件到 S3');
    console.log('   📤 测试文件已上传，你可以稍后在 S3 控制台删除它');
  } else {
    results.putObject = { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    console.log(`   ❌ 上传失败: HTTP ${response.status}: ${response.statusText}`);
    const errorText = await response.text();
    console.log(`   📄 错误详情: ${errorText.substring(0, 200)}`);
  }
} catch (error) {
  results.putObject = { success: false, error: error.message };
  console.log(`   ❌ 失败: ${error.message}`);
  console.log('\n   💡 如果这个操作失败，上传功能将无法正常工作！');
}

console.log('\n' + '='.repeat(70));
console.log('📊 诊断总结\n');

// 总结
const criticalTests = [results.getSignedUrl, results.putObject];
const diagnosticTests = [results.headBucket, results.listObjectsV2];

const criticalPassed = criticalTests.every(t => t && t.success);
const diagnosticPassed = diagnosticTests.every(t => t && t.success);

if (criticalPassed) {
  console.log('✅ 关键功能测试通过！');
  console.log('   - 预签名 URL 生成：✅');
  console.log('   - 实际上传功能：✅');
  console.log('\n   💡 结论：虽然 headBucket 失败，但上传功能应该可以正常工作！');
  console.log('   💡 建议：可以暂时忽略 headBucket 错误，或者按照下面的建议修复。\n');
} else {
  console.log('❌ 关键功能测试失败！');
  console.log('   - 预签名 URL 生成：', results.getSignedUrl?.success ? '✅' : '❌');
  console.log('   - 实际上传功能：', results.putObject?.success ? '✅' : '❌');
  console.log('\n   ⚠️  警告：上传功能可能无法正常工作！\n');
}

if (!diagnosticPassed) {
  console.log('⚠️  诊断测试失败：');
  console.log('   - headBucket：', results.headBucket?.success ? '✅' : '❌');
  console.log('   - listObjectsV2：', results.listObjectsV2?.success ? '✅' : '❌');
  console.log('\n   💡 这不会影响上传功能，但诊断工具会显示错误。\n');
}

// 提供修复建议
console.log('🔧 修复建议：\n');

if (!results.headBucket?.success && results.getSignedUrl?.success) {
  console.log('情况：headBucket 失败但预签名 URL 生成成功');
  console.log('建议：');
  console.log('1. 这是正常的，不影响上传功能');
  console.log('2. 如果想修复，可以添加 s3:HeadBucket 或 s3:ListBucket 权限');
  console.log('3. 或者检查存储桶策略是否有 Deny 规则\n');
} else if (!results.getSignedUrl?.success) {
  console.log('情况：预签名 URL 生成失败');
  console.log('建议：');
  console.log('1. 检查访问密钥是否正确');
  console.log('2. 检查区域配置是否与存储桶一致');
  console.log('3. 检查 IAM 用户是否有基本的 S3 权限\n');
} else if (!results.listBuckets?.success) {
  console.log('情况：无法列出存储桶');
  console.log('建议：');
  console.log('1. 访问密钥可能无效或错误');
  console.log('2. IAM 用户可能没有基本权限');
  console.log('3. 检查 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY\n');
}

console.log('📖 详细排查指南：已添加AmazonS3FullAccess但仍失败排查.md\n');

