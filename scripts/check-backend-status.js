/**
 * 检查后端服务状态脚本
 * 用于诊断 "Failed to fetch" 错误
 */

import http from 'http';

console.log('🔍 检查后端服务状态...\n');

const BACKEND_URL = 'http://localhost:3000';
const API_ENDPOINT = `${BACKEND_URL}/api/health`;

// 检查后端服务是否运行
function checkBackendHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(API_ENDPOINT, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ status: 'running', data });
        } else {
          resolve({ status: 'error', statusCode: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        reject({ type: 'connection_refused', message: '后端服务未运行' });
      } else {
        reject({ type: 'network_error', message: error.message });
      }
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({ type: 'timeout', message: '连接超时' });
    });
  });
}

// 主函数
async function main() {
  console.log('📡 正在检查后端服务...');
  console.log(`   后端地址: ${BACKEND_URL}\n`);
  
  try {
    const result = await checkBackendHealth();
    
    if (result.status === 'running') {
      console.log('✅ 后端服务正在运行！');
      console.log(`   响应: ${result.data}\n`);
      console.log('💡 如果前端仍然显示 "Failed to fetch"：');
      console.log('   1. 检查前端 vite.config.ts 中的 proxy 配置');
      console.log('   2. 检查浏览器控制台的 Network 标签，查看具体错误');
      console.log('   3. 确认前端开发服务器正在运行（npm run dev）\n');
    } else {
      console.log('⚠️  后端服务响应异常');
      console.log(`   状态码: ${result.statusCode}`);
      console.log(`   响应: ${result.data}\n`);
    }
  } catch (error) {
    if (error.type === 'connection_refused') {
      console.log('❌ 后端服务未运行！\n');
      console.log('📋 解决方案：');
      console.log('   1. 打开新的终端窗口');
      console.log('   2. 进入后端目录：cd backend');
      console.log('   3. 启动后端服务：npm run start:dev');
      console.log('   4. 等待看到 "应用运行在端口 3000" 的提示\n');
    } else if (error.type === 'timeout') {
      console.log('⏱️  连接超时\n');
      console.log('📋 可能的原因：');
      console.log('   1. 后端服务启动失败（检查后端日志）');
      console.log('   2. 端口被占用');
      console.log('   3. 防火墙阻止连接\n');
    } else {
      console.log(`❌ 网络错误: ${error.message}\n`);
    }
    
    console.log('🔧 检查步骤：');
    console.log('   1. 确认后端服务已启动');
    console.log('   2. 检查 backend/.env 文件配置是否正确');
    console.log('   3. 查看后端启动日志，确认没有错误');
    console.log('   4. 确认端口 3000 未被占用\n');
  }
  
  // 检查环境变量配置
  console.log('📝 环境变量检查：');
  console.log('   请确认 backend/.env 文件包含以下配置：');
  console.log('   - DATABASE_URL');
  console.log('   - JWT_SECRET');
  console.log('   - OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET');
  console.log('   - OSS_REGION');
  console.log('   - OSS_BUCKET\n');
}

main().catch(console.error);

