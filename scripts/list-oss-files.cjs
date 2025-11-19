/**
 * 列出 OSS 存储桶中的文件
 * 特别关注 uploads/ 目录下的图片文件
 */

const path = require('path');
const OSS = require('ali-oss');
const dotenv = require('dotenv');

// 尝试加载 backend/.env，然后再加载根目录 .env
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config();

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
};

const accessKeyId = getEnv('OSS_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
const accessKeySecret = getEnv('OSS_ACCESS_KEY_SECRET', 'AWS_SECRET_ACCESS_KEY');
const region = getEnv('OSS_REGION', 'AWS_REGION');
const bucket = getEnv('OSS_BUCKET', 'AWS_S3_BUCKET');
const endpoint = getEnv('OSS_ENDPOINT', 'AWS_S3_ENDPOINT');

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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function listFiles(client, prefix = '', maxKeys = 100) {
  try {
    const result = await client.list(
      {
        prefix,
        'max-keys': maxKeys,
      },
      {},
    );

    return result.objects || [];
  } catch (error) {
    console.error(`❌ 列出文件失败 (prefix: ${prefix}):`, error?.message || error);
    return [];
  }
}

async function main() {
  console.log('📁 OSS 文件列表查看器');
  console.log('='.repeat(60));
  console.log('当前配置:');
  console.log(`   - Region: ${region || '未配置'}`);
  console.log(`   - Bucket: ${bucket || '未配置'}`);
  console.log(`   - Endpoint: ${endpoint || '默认（根据 Region 推导）'}`);
  console.log('');

  ensureEnv();
  const client = createClient();

  // 1. 列出 uploads/ 目录下的文件
  console.log('📋 检查 uploads/ 目录（上传的图片应该在这里）');
  console.log('-'.repeat(60));
  const uploadsFiles = await listFiles(client, 'uploads/', 100);
  
  if (uploadsFiles.length === 0) {
    console.log('⚠️  uploads/ 目录为空，还没有上传过图片');
  } else {
    console.log(`✅ 找到 ${uploadsFiles.length} 个文件：\n`);
    
    uploadsFiles.forEach((file, index) => {
      const fileSize = formatFileSize(file.size);
      const lastModified = formatDate(file.lastModified);
      const publicUrl = endpoint
        ? `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}/${file.name}`
        : `https://${bucket}.${region}.aliyuncs.com/${file.name}`;
      
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   大小: ${fileSize}`);
      console.log(`   修改时间: ${lastModified}`);
      console.log(`   访问地址: ${publicUrl}`);
      console.log('');
    });
  }

  console.log('');

  // 2. 列出根目录下的所有文件（不包括子目录）
  console.log('📋 检查根目录下的文件');
  console.log('-'.repeat(60));
  const rootFiles = await listFiles(client, '', 100);
  
  // 过滤掉子目录中的文件（只显示直接在根目录的文件）
  const directRootFiles = rootFiles.filter(file => {
    const key = file.name;
    // 排除 uploads/ 和 assets/ 等目录下的文件
    return !key.includes('/');
  });

  if (directRootFiles.length === 0) {
    console.log('⚠️  根目录下没有直接文件');
  } else {
    console.log(`✅ 找到 ${directRootFiles.length} 个根目录文件：\n`);
    
    directRootFiles.forEach((file, index) => {
      const fileSize = formatFileSize(file.size);
      const lastModified = formatDate(file.lastModified);
      const publicUrl = endpoint
        ? `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}/${file.name}`
        : `https://${bucket}.${region}.aliyuncs.com/${file.name}`;
      
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   大小: ${fileSize}`);
      console.log(`   修改时间: ${lastModified}`);
      console.log(`   访问地址: ${publicUrl}`);
      console.log('');
    });
  }

  console.log('');

  // 3. 统计信息
  console.log('📊 统计信息');
  console.log('-'.repeat(60));
  const allFiles = await listFiles(client, '', 1000);
  const uploadsCount = allFiles.filter(f => f.name.startsWith('uploads/')).length;
  const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const uploadsSize = allFiles
    .filter(f => f.name.startsWith('uploads/'))
    .reduce((sum, file) => sum + (file.size || 0), 0);

  console.log(`   - 总文件数: ${allFiles.length}`);
  console.log(`   - uploads/ 目录文件数: ${uploadsCount}`);
  console.log(`   - 总存储大小: ${formatFileSize(totalSize)}`);
  console.log(`   - uploads/ 目录大小: ${formatFileSize(uploadsSize)}`);
  console.log('');

  // 4. 提示
  if (uploadsFiles.length === 0) {
    console.log('💡 提示：');
    console.log('   - 如果还没有上传过图片，这是正常的');
    console.log('   - 你可以通过前端管理后台上传图片，图片会自动保存到 uploads/ 目录');
    console.log('   - 上传后再次运行此脚本即可看到文件列表');
  } else {
    console.log('💡 提示：');
    console.log('   - 你可以在 OSS 控制台的文件管理页面查看这些文件');
    console.log('   - 访问地址可以直接在浏览器中打开查看图片');
  }
}

main().catch((error) => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

