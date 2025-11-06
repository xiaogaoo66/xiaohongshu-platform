/**
 * S3 上传验证脚本
 * 用于验证图片是否成功上传到 S3
 */

const AWS = require('aws-sdk');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

console.log('🔍 验证 S3 上传配置...\n');

// 检查环境变量
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET;

if (!accessKeyId || !secretAccessKey || !bucket) {
  console.error('❌ 缺少必要的环境变量：');
  if (!accessKeyId) console.error('   - AWS_ACCESS_KEY_ID');
  if (!secretAccessKey) console.error('   - AWS_SECRET_ACCESS_KEY');
  if (!bucket) console.error('   - AWS_S3_BUCKET');
  console.error('\n请确保已配置所有 AWS S3 环境变量。');
  process.exit(1);
}

console.log('✅ 环境变量检查通过');
console.log(`   - Region: ${region}`);
console.log(`   - Bucket: ${bucket}\n`);

// 初始化 S3
const s3 = new AWS.S3({
  accessKeyId,
  secretAccessKey,
  region,
});

// 验证函数
async function verifyS3Upload() {
  try {
    console.log('📦 检查 S3 存储桶...');
    
    // 检查存储桶是否存在
    await s3.headBucket({ Bucket: bucket }).promise();
    console.log('✅ 存储桶存在且可访问\n');

    // 列出 uploads/ 文件夹中的文件
    console.log('📁 列出 uploads/ 文件夹中的文件...\n');
    const params = {
      Bucket: bucket,
      Prefix: 'uploads/',
      MaxKeys: 20, // 最多显示20个文件
    };

    const data = await s3.listObjectsV2(params).promise();

    if (!data.Contents || data.Contents.length === 0) {
      console.log('⚠️  uploads/ 文件夹为空');
      console.log('   提示：请先在前端管理后台上传一张图片，然后再运行此脚本。\n');
    } else {
      console.log(`✅ 找到 ${data.Contents.length} 个文件：\n`);
      
      data.Contents.forEach((file, index) => {
        const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${file.Key}`;
        const fileSize = (file.Size / 1024).toFixed(2); // KB
        const lastModified = new Date(file.LastModified).toLocaleString('zh-CN');
        
        console.log(`${index + 1}. ${file.Key}`);
        console.log(`   大小: ${fileSize} KB`);
        console.log(`   修改时间: ${lastModified}`);
        console.log(`   URL: ${fileUrl}`);
        console.log('');
      });

      // 测试访问第一个文件
      if (data.Contents.length > 0) {
        const firstFile = data.Contents[0];
        const testUrl = `https://${bucket}.s3.${region}.amazonaws.com/${firstFile.Key}`;
        
        console.log('🔗 测试文件访问...');
        try {
          // 使用 AWS SDK 检查文件是否存在
          await s3.headObject({ Bucket: bucket, Key: firstFile.Key }).promise();
          console.log(`✅ 文件存在且可访问: ${testUrl}`);
          console.log(`   提示：在浏览器中打开此URL，确认图片可以正常显示\n`);
        } catch (error) {
          console.log(`⚠️  无法访问文件: ${error.message}`);
          console.log(`   可能原因：存储桶权限未正确配置\n`);
        }
      }
    }

    // 统计信息
    const allParams = {
      Bucket: bucket,
      Prefix: 'uploads/',
    };
    
    const allData = await s3.listObjectsV2(allParams).promise();
    const totalFiles = allData.Contents ? allData.Contents.length : 0;
    const totalSize = allData.Contents 
      ? allData.Contents.reduce((sum, file) => sum + file.Size, 0) 
      : 0;
    
    console.log('📊 统计信息：');
    console.log(`   - 总文件数: ${totalFiles}`);
    console.log(`   - 总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    
    if (error.code === 'NotFound') {
      console.error('\n可能原因：');
      console.error('  1. 存储桶名称不正确');
      console.error('  2. 存储桶不存在');
      console.error('  3. 访问密钥没有权限访问该存储桶');
    } else if (error.code === 'AccessDenied') {
      console.error('\n可能原因：');
      console.error('  1. 访问密钥没有足够的权限');
      console.error('  2. 存储桶策略限制了访问');
    }
    
    process.exit(1);
  }
}

// 运行验证
verifyS3Upload();

