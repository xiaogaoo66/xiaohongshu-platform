/**
 * OSS 上传配置快速体检脚本
 * 1. 检查环境变量
 * 2. 验证 Bucket 可达性
 * 3. 生成预签名 URL
 * 4. 进行一次写入/删除测试
 */

const path = require('path');
const OSS = require('ali-oss');
const dotenv = require('dotenv');

// 尝试加载 backend/.env，然后再加载根目录 .env
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config();

const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const region = process.env.OSS_REGION;
const bucket = process.env.OSS_BUCKET;
const endpoint = process.env.OSS_ENDPOINT;

function ensureEnv() {
  const missing = [];
  if (!accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
  if (!accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
  if (!region) missing.push('OSS_REGION');
  if (!bucket) missing.push('OSS_BUCKET');

  if (missing.length) {
    console.error('❌ 缺少以下 OSS 环境变量：');
    missing.forEach((item) => console.error(`   - ${item}`));
    process.exit(1);
  }
}

function createClient() {
  const options = {
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    secure: true,
  };

  if (endpoint) {
    options.endpoint = endpoint;
  }

  return new OSS(options);
}

async function checkBucketInfo(client) {
  console.log('\n📋 检查 1：Bucket 可访问性');
  try {
    const info = await client.getBucketInfo(bucket);
    console.log('✅ 可以访问 Bucket');
    console.log('   - 名称:', bucket);
    console.log('   - 区域:', info?.bucket?.Location || 'unknown');
    console.log('   - 创建时间:', info?.bucket?.CreationDate || 'unknown');
  } catch (error) {
    console.error('❌ 无法获取 Bucket 信息:', error?.message || error);
  }
}

async function checkPresignedUrl(client) {
  console.log('\n📋 检查 2：预签名 URL 生成');
  try {
    const key = `diagnosis/check-oss-${Date.now()}.txt`;
    const contentType = 'text/plain';
    const url = client.signatureUrl(key, {
      method: 'PUT',
      expires: 120,
      headers: {
        'Content-Type': contentType,
      },
    });

    const parsed = new URL(url);
    console.log('✅ 预签名 URL 生成成功');
    console.log('   - Host:', parsed.host);
    console.log('   - Expires:', parsed.searchParams.get('Expires'));
    console.log('   - OSSAccessKeyId:', parsed.searchParams.get('OSSAccessKeyId') ? '存在' : '无');
  } catch (error) {
    console.error('❌ 预签名 URL 生成失败:', error?.message || error);
  }
}

async function checkWritePermission(client) {
  console.log('\n📋 检查 3：写入/删除权限');
  const key = `diagnosis/write-test-${Date.now()}.txt`;
  try {
    await client.put(key, Buffer.from('oss-upload-config-check'), {
      headers: { 'Content-Type': 'text/plain' },
    });
    console.log('✅ 写入成功');

    await client.delete(key);
    console.log('✅ 删除成功');
  } catch (error) {
    console.error('❌ 写入或删除失败:', error?.message || error);
  }
}

async function main() {
  console.log('🔍 OSS 上传配置体检');
  console.log('='.repeat(40));
  console.log('当前配置:');
  console.log(`   - Region: ${region || '未配置'}`);
  console.log(`   - Bucket: ${bucket || '未配置'}`);
  console.log(`   - Endpoint: ${endpoint || '默认（根据 Region 推导）'}`);

  ensureEnv();
  const client = createClient();

  await checkBucketInfo(client);
  await checkPresignedUrl(client);
  await checkWritePermission(client);

  console.log('\n✅ 检查完成，如仍有问题请查看 docs/OSS_DETAILED_CONFIG_GUIDE.md');
}

main().catch((error) => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

