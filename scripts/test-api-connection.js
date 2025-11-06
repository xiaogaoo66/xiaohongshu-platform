/**
 * 测试前端到后端的 API 连接
 */

import http from 'http';

console.log('🔍 测试 API 连接...\n');

const BACKEND_URL = 'http://localhost:3000';
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/content/count',
  '/api/upload/presigned-url',
];

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          endpoint,
          statusCode: res.statusCode,
          status: res.statusCode < 400 ? '✅' : '❌',
          data: data.substring(0, 100), // 只显示前100个字符
        });
      });
    });
    
    req.on('error', (error) => {
      reject({ endpoint, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({ endpoint, error: '连接超时' });
    });
  });
}

async function main() {
  console.log(`📡 后端地址: ${BACKEND_URL}\n`);
  
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      const result = await testEndpoint(endpoint);
      console.log(`${result.status} ${endpoint}`);
      console.log(`   状态码: ${result.statusCode}`);
      if (result.data) {
        console.log(`   响应: ${result.data}...`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   错误: ${error.error || error.message}\n`);
    }
  }
  
  console.log('💡 提示：');
  console.log('   1. 如果所有端点都显示 ✅，说明后端正常运行');
  console.log('   2. 如果显示 ❌ 或连接错误，检查后端服务是否启动');
  console.log('   3. 修改 vite.config.ts 后，必须重启前端开发服务器\n');
}

main().catch(console.error);

