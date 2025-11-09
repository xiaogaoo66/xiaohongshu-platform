#!/usr/bin/env node

/**
 * 前端性能诊断脚本
 * 用于诊断 https://www.acgmbti.online 的访问速度问题
 */

import https from 'https';
import http from 'http';
import { performance } from 'perf_hooks';
import { promises as dns } from 'dns';

// 配置
const FRONTEND_URL = 'https://www.acgmbti.online';
const BACKEND_URL = 'https://xiaohongshu-platform-production.up.railway.app';
const TIMEOUT = 30000; // 30秒超时
const DOMAIN = 'acgmbti.online';
const DNS_PROVIDER = 'Cloudflare'; // DNS 服务商

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logResult(name, time, status, threshold = 1000) {
  const color = time < threshold ? 'green' : time > threshold * 2 ? 'red' : 'yellow';
  const statusIcon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  log(`${statusIcon} ${name}: ${time}ms`, color);
}

// 测试 DNS 解析速度
async function testDNS(hostname) {
  try {
    const start = performance.now();
    const addresses = await dns.resolve4(hostname);
    const time = Math.round(performance.now() - start);
    const status = time < 100 ? 'success' : time < 500 ? 'warning' : 'error';
    logResult('DNS 解析', time, status, 100);
    log(`   解析到的 IP: ${addresses.join(', ')}`, 'blue');
    return { success: true, time, addresses };
  } catch (error) {
    log(`❌ DNS 解析失败: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// 检查 Cloudflare DNS 记录
async function checkCloudflareDNS() {
  try {
    log('\n检查 Cloudflare DNS 配置...', 'cyan');
    log('DNS 服务商: Cloudflare', 'blue');
    log('域名: acgmbti.online', 'blue');
    log('\n建议检查以下 Cloudflare 设置：', 'yellow');
    log('1. 登录 Cloudflare 控制台：https://dash.cloudflare.com/', 'blue');
    log('2. 选择域名 acgmbti.online', 'blue');
    log('3. 进入 DNS → Records', 'blue');
    log('4. 检查以下记录：', 'blue');
    log('   - www.acgmbti.online (CNAME 或 A 记录)', 'blue');
    log('   - acgmbti.online (A 记录，如果使用根域名)', 'blue');
    log('5. 确认 Proxy 状态：', 'yellow');
    log('   - 如果使用 Vercel：Proxy 应该是关闭（灰色云朵）', 'blue');
    log('   - 如果使用其他服务：根据服务商要求配置', 'blue');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 测试 HTTP 请求速度
function testHTTP(url, description) {
  return new Promise((resolve) => {
    const start = performance.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const time = Math.round(performance.now() - start);
        const status = res.statusCode === 200 ? 'success' : 'warning';
        logResult(description, time, status, 2000);
        resolve({ success: true, time, statusCode: res.statusCode, size: data.length });
      });
    });

    req.on('error', (error) => {
      const time = Math.round(performance.now() - start);
      log(`❌ ${description} 失败: ${error.message}`, 'red');
      resolve({ success: false, time, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      log(`❌ ${description} 超时 (${TIMEOUT}ms)`, 'red');
      resolve({ success: false, time: TIMEOUT, error: 'timeout' });
    });

    req.setTimeout(TIMEOUT);
  });
}

// 测试后端 API
async function testBackendAPI() {
  try {
    const start = performance.now();
    const url = `${BACKEND_URL}/api/health`;
    
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const time = Math.round(performance.now() - start);
          const status = res.statusCode === 200 || res.statusCode === 404 ? 'success' : 'warning';
          // 404 也算成功，说明后端能响应
          logResult('后端 API 响应', time, status, 1000);
          resolve({ success: true, time, statusCode: res.statusCode });
        });
      }).on('error', (error) => {
        const time = Math.round(performance.now() - start);
        log(`❌ 后端 API 请求失败: ${error.message}`, 'red');
        resolve({ success: false, time, error: error.message });
      }).setTimeout(TIMEOUT, () => {
        log(`❌ 后端 API 请求超时 (${TIMEOUT}ms)`, 'red');
        resolve({ success: false, time: TIMEOUT, error: 'timeout' });
      });
    });
  } catch (error) {
    log(`❌ 后端 API 测试失败: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  log('\n🔍 前端性能诊断工具', 'cyan');
  log(`前端地址: ${FRONTEND_URL}`, 'blue');
  log(`后端地址: ${BACKEND_URL}`, 'blue');
  log(`DNS 服务商: ${DNS_PROVIDER}`, 'blue');
  log(`超时设置: ${TIMEOUT}ms`, 'blue');

  const results = {
    dns: null,
    frontend: null,
    backend: null,
  };

  // 1. 测试 DNS 解析
  logSection('1. DNS 解析测试');
  results.dns = await testDNS('www.acgmbti.online');
  
  // 1.1 检查 Cloudflare DNS 配置
  await checkCloudflareDNS();

  // 2. 测试前端页面加载
  logSection('2. 前端页面加载测试');
  results.frontend = await testHTTP(FRONTEND_URL, '前端页面加载');

  // 3. 测试后端 API
  logSection('3. 后端 API 测试');
  results.backend = await testBackendAPI();

  // 4. 总结
  logSection('诊断总结');
  
  const issues = [];
  if (!results.dns.success || results.dns.time > 500) {
    issues.push('DNS 解析慢或失败');
  }
  if (!results.frontend.success || results.frontend.time > 5000) {
    issues.push('前端页面加载慢或失败');
  }
  if (!results.backend.success || results.backend.time > 5000) {
    issues.push('后端 API 响应慢或失败');
  }

  if (issues.length === 0) {
    log('✅ 所有测试通过，性能正常', 'green');
  } else {
    log('⚠️ 发现以下问题：', 'yellow');
    issues.forEach(issue => {
      log(`  - ${issue}`, 'yellow');
    });
    log('\n建议操作：', 'cyan');
    log('1. 检查 Cloudflare DNS 配置（最重要）', 'blue');
    log('   - 登录：https://dash.cloudflare.com/1624b6c78e7ef210a631eaa1a6559970/acgmbti.online/dns/records', 'blue');
    log('   - 检查 DNS 记录是否正确', 'blue');
    log('   - 确认 Proxy 状态（如果使用 Vercel，应该关闭代理）', 'blue');
    log('2. 清除 Cloudflare 缓存', 'blue');
    log('   - 在 Cloudflare 控制台 → Caching → Purge Everything', 'blue');
    log('3. 检查后端服务状态（Railway 控制台）', 'blue');
    log('4. 优化 Cloudflare 性能设置', 'blue');
    log('   - Speed → Optimization → Auto Minify（开启 JS/CSS/HTML 压缩）', 'blue');
    log('   - Speed → Caching → Browser Cache TTL（设置为 4 小时或更长）', 'blue');
  }

  // 性能基准对比
  logSection('性能基准对比');
  log('正常指标：', 'cyan');
  log('  - DNS 解析: < 100ms', 'green');
  log('  - 前端加载: < 2s', 'green');
  log('  - 后端响应: < 1s', 'green');
  log('\n当前结果：', 'cyan');
  if (results.dns.success) {
    log(`  - DNS 解析: ${results.dns.time}ms`, results.dns.time < 100 ? 'green' : results.dns.time < 500 ? 'yellow' : 'red');
  }
  if (results.frontend.success) {
    log(`  - 前端加载: ${results.frontend.time}ms`, results.frontend.time < 2000 ? 'green' : results.frontend.time < 5000 ? 'yellow' : 'red');
  }
  if (results.backend.success) {
    log(`  - 后端响应: ${results.backend.time}ms`, results.backend.time < 1000 ? 'green' : results.backend.time < 5000 ? 'yellow' : 'red');
  }

  console.log('\n');
}

// 运行诊断
main().catch(error => {
  log(`❌ 诊断过程出错: ${error.message}`, 'red');
  process.exit(1);
});

