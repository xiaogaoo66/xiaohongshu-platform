/**
 * OSS 深度诊断脚本
 * - 多维度检查 AccessKey、Bucket、CORS、ACL、预签名 URL 与真实上传链路
 * - 支持 JSON 输出以及自定义 env/config 覆盖
 *
 * 用法：
 *   node scripts/deep-diagnose-oss.cjs
 *   node scripts/deep-diagnose-oss.cjs --json --skip-upload
 *   node scripts/deep-diagnose-oss.cjs --env ./custom.env --bucket my-bucket
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const OSS = require('ali-oss');
const { URL } = require('url');

const RAW_ARGS = process.argv.slice(2);
const cli = parseCliArgs(RAW_ARGS);
const isJsonMode = Boolean(cli.json);

const DEFAULT_ENV_PATHS = [
  path.resolve(__dirname, '../backend/.env'),
  path.resolve(__dirname, '../.env'),
];

const extraEnvPaths = []
  .concat(cli.env || [])
  .concat(cli.config || [])
  .filter(Boolean)
  .map((p) => path.resolve(process.cwd(), p));

loadEnvFiles([...DEFAULT_ENV_PATHS, ...extraEnvPaths]);

const config = {
  accessKeyId: cli.accessKeyId || process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: cli.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET,
  region: cli.region || process.env.OSS_REGION,
  bucket: cli.bucket || process.env.OSS_BUCKET,
  endpoint: cli.endpoint || process.env.OSS_ENDPOINT,
  keyPrefix: cli.keyPrefix || process.env.OSS_DIAG_KEY_PREFIX || 'diagnosis',
  contentType: cli.contentType || 'text/plain',
};

const state = {
  checks: [],
  recommendations: new Set(),
};

const logger = {
  info: (...args) => {
    if (!isJsonMode) console.log(...args);
  },
  warn: (...args) => {
    if (!isJsonMode) console.warn(...args);
  },
  error: (...args) => {
    if (!isJsonMode) console.error(...args);
  },
};

function statusSymbol(status) {
  if (status === 'pass') return '✅';
  if (status === 'warn') return '⚠️';
  return '❌';
}

function mask(value, visible = 4) {
  if (!value) return '未配置';
  if (value.length <= visible * 2) return `${value.slice(0, visible)}***`;
  return `${value.slice(0, visible)}***${value.slice(-visible)}`;
}

function toArray(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function parseCliArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const keyRaw = arg.slice(2);
    const key = keyRaw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    let value = true;
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      value = next;
      i += 1;
    }

    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadEnvFiles(paths) {
  paths.forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  });
}

function addRecommendation(text) {
  if (text) {
    state.recommendations.add(text);
  }
}

function logDetails(details) {
  if (!details || isJsonMode) return;
  if (Array.isArray(details)) {
    details.forEach((line) => logger.info(`   - ${line}`));
  } else {
    logger.info(`   - ${details}`);
  }
}

async function runCheck(id, title, executor) {
  logger.info(`\n📋 ${title}`);
  try {
    const result = await executor();
    const entry = {
      id,
      title,
      status: result.status || 'pass',
      message: result.message,
      details: result.details,
      meta: result.meta,
      fatal: Boolean(result.fatal),
    };
    state.checks.push(entry);
    logger.info(`${statusSymbol(entry.status)} ${entry.message || title}`);
    logDetails(entry.details);
    return entry;
  } catch (error) {
    const entry = {
      id,
      title,
      status: 'fail',
      message: error?.message || error,
      details: error?.details,
      fatal: true,
      meta: { code: error?.code },
    };
    state.checks.push(entry);
    logger.error(`${statusSymbol('fail')} ${entry.message}`);
    logDetails(entry.details);
    return entry;
  }
}

function createClient() {
  const options = {
    region: config.region,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    secure: true,
    timeout: '60s',
  };

  if (config.endpoint) {
    options.endpoint = config.endpoint;
  }

  return new OSS(options);
}

function formatOssError(error) {
  if (!error) return '未知错误';
  const parts = [];
  if (error.code) parts.push(`${error.code}`);
  if (error.status) parts.push(`HTTP ${error.status}`);
  if (error.name && error.name !== error.code) parts.push(error.name);
  return `${parts.join(' | ')}${parts.length ? ' - ' : ''}${error.message || ''}`.trim();
}

const OSS_CANONICAL_SUBRESOURCES = [
  'acl',
  'uploads',
  'location',
  'cors',
  'logging',
  'website',
  'referer',
  'lifecycle',
  'delete',
  'append',
  'position',
  'security-token',
  'x-oss-process',
  'response-content-type',
  'response-content-language',
  'response-cache-control',
  'response-content-encoding',
  'response-expires',
];

function parseOssErrorXml(xml) {
  if (!xml || typeof xml !== 'string') return null;
  const getTag = (tag) => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return undefined;
    return match[1].trim();
  };
  return {
    code: getTag('Code'),
    message: getTag('Message'),
    requestId: getTag('RequestId'),
    hostId: getTag('HostId'),
    stringToSign: getTag('StringToSign'),
    stringToSignBytes: getTag('StringToSignBytes'),
    ossAccessKeyId: getTag('OSSAccessKeyId'),
    canonicalRequest: getTag('CanonicalRequest'),
  };
}

function buildCanonicalizedResource(url, bucket) {
  if (!url) return '';
  const pathname = decodeURIComponent(url.pathname || '/');
  let resourcePath = pathname;
  const pathHasBucket = pathname.startsWith(`/${bucket}/`) || pathname === `/${bucket}`;
  const hostHasBucket = bucket && url.host && url.host.startsWith(`${bucket}.`);

  if (bucket && !pathHasBucket && hostHasBucket) {
    resourcePath = `/${bucket}${pathname}`;
  } else if (bucket && !pathHasBucket && !hostHasBucket) {
    resourcePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  }

  const subresources = [];
  OSS_CANONICAL_SUBRESOURCES.forEach((key) => {
    if (url.searchParams.has(key)) {
      const value = url.searchParams.get(key);
      subresources.push(value ? `${key}=${value}` : key);
    }
  });

  if (subresources.length) {
    resourcePath += `?${subresources.sort().join('&')}`;
  }

  return resourcePath;
}

function buildPresignString({ method, contentType, expires, canonicalResource }) {
  const lines = [
    (method || '').toUpperCase(),
    '',
    contentType || '',
    expires || '',
    canonicalResource || '',
  ];
  return lines.join('\n');
}

function analyzeSignatureMismatch({ ossError, uploadUrl, method, contentType, bucket }) {
  if (!ossError?.stringToSign || !uploadUrl) {
    return null;
  }
  const url = new URL(uploadUrl);
  const expires = url.searchParams.get('Expires') || '';
  const canonicalResource = buildCanonicalizedResource(url, bucket);
  const expectedString = buildPresignString({
    method,
    contentType,
    expires,
    canonicalResource,
  });

  const actualString = ossError.stringToSign.trim();
  if (!actualString) return null;

  const actualLines = actualString.split('\n');
  const expectedLines = expectedString.split('\n');
  const labels = ['HTTP 方法', 'Content-MD5', 'Content-Type', 'Expires/Date', 'CanonicalizedResource'];
  const diffs = [];

  labels.forEach((label, idx) => {
    const actual = actualLines[idx] || '';
    const expected = expectedLines[idx] || '';
    if (actual !== expected) {
      diffs.push(`${label} 不一致：预期 "${expected}" | 实际 "${actual}"`);
    }
  });

  const hints = [];
  const actualContentType = actualLines[2] || '';
  const expectedContentType = expectedLines[2] || '';
  if (expectedContentType && !actualContentType) {
    hints.push('后台签名时没有把 Content-Type 放入待签名字符串，但上传请求携带了该 Header。');
  }
  if (!expectedContentType && actualContentType) {
    hints.push('后台签名包含了 Content-Type，但上传请求未发送该 Header。');
  }
  if ((actualLines[4] || '') !== (expectedLines[4] || '')) {
    hints.push('CanonicalizedResource 不一致，请确认 Bucket/Key 或是否多签了查询参数。');
  }

  return {
    expectedString,
    actualString,
    diffs,
    hints,
  };
}

async function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const mod = await import('node-fetch');
  return mod.default;
}

async function main() {
  logger.info('🔍 OSS 深度诊断工具');
  logger.info('='.repeat(60));
  logger.info('当前配置（敏感信息已脱敏）：');
  logger.info(`   - AccessKeyId: ${mask(config.accessKeyId)}`);
  logger.info(`   - Region: ${config.region || '未配置'}`);
  logger.info(`   - Bucket: ${config.bucket || '未配置'}`);
  logger.info(`   - Endpoint: ${config.endpoint || '根据 Region 自动推导'}`);
  logger.info(`   - KeyPrefix: ${config.keyPrefix}`);

  const envResult = await runCheck('env-basic', '环境变量完整性', async () => {
    const missing = [];
    if (!config.accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
    if (!config.accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
    if (!config.region) missing.push('OSS_REGION');
    if (!config.bucket) missing.push('OSS_BUCKET');

    if (missing.length) {
      addRecommendation('填充 backend/.env 或根 .env 中缺失的 OSS_* 配置。');
      return {
        status: 'fail',
        message: `缺少必要配置：${missing.join(', ')}`,
        fatal: true,
      };
    }

    const warnings = [];
    if (config.accessKeyId && !config.accessKeyId.startsWith('LTAI')) {
      warnings.push('AccessKey ID 非 LTAI* 格式（确认未使用子账号临时凭证）。');
    }
    if (config.region && !/^oss-[a-z]+-[a-z\d-]+$/.test(config.region)) {
      warnings.push('OSS_REGION 看起来不是标准格式，例如 oss-cn-hangzhou。');
      addRecommendation('确认 Region 与 OSS 控制台保持一致。');
    }
    if (config.bucket && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.bucket)) {
      warnings.push('Bucket 名称包含非法字符，需全小写、数字或连字符。');
    }

    if (warnings.length) {
      warnings.forEach((w) => addRecommendation(w));
      return {
        status: 'warn',
        message: '变量存在潜在格式问题，请核对',
        details: warnings,
      };
    }

    return { status: 'pass', message: '必填变量齐全 ✅' };
  });

  if (envResult?.fatal) {
    return finalize(1);
  }

  const client = createClient();

  const credentialResult = await runCheck('ak-validity', '访问凭证有效性（listBuckets）', async () => {
    try {
      const res = await client.listBuckets({ 'max-keys': 5 });
      const buckets = res.buckets || res.items || [];
      const bucketNames = buckets.map((b) => b.name || b.Name);
      const exists = bucketNames.includes(config.bucket);
      if (!exists) {
        addRecommendation('确认当前 AccessKey 所属账号下存在目标 Bucket，或更新为正确的 Bucket 名称。');
      }
      return {
        status: exists ? 'pass' : 'warn',
        message: exists ? 'AccessKey 可列出 Bucket 且包含目标 Bucket' : 'AccessKey 可用，但未在账户下发现目标 Bucket',
        details: bucketNames.length
          ? [`账户中 Bucket: ${bucketNames.join(', ')}`]
          : ['账户中未能列出任何 Bucket（可能权限受限）'],
        meta: { bucketExists: exists, buckets: bucketNames },
      };
    } catch (error) {
      addRecommendation('在 RAM 控制台为该 AccessKey 添加 AliyunOSSFullAccess 或至少 ListBuckets 权限。');
      throw new Error(`无法列出 Bucket：${formatOssError(error)}`);
    }
  });

  if (credentialResult?.fatal) {
    return finalize(1);
  }

  await runCheck('bucket-info', 'Bucket 信息与地域一致性', async () => {
    const info = await client.getBucketInfo(config.bucket);
    const actualRegion = info?.bucket?.Location || info?.bucket?.location;
    const details = [
      `实际 Region：${actualRegion || '未知'}`,
      `创建时间：${info?.bucket?.CreationDate || info?.bucket?.creationDate || '未知'}`,
    ];
    if (actualRegion && config.region && actualRegion !== config.region) {
      addRecommendation('Region 与 OSS 控制台不一致时，需要更新 OSS_REGION 以免生成错误的上传地址。');
      return {
        status: 'warn',
        message: 'Bucket 可访问，但 Region 与配置不匹配',
        details,
      };
    }
    return {
      status: 'pass',
      message: 'Bucket 信息获取成功，Region 匹配 ✅',
      details,
    };
  });

  await runCheck('bucket-acl', 'ACL / 读写权限', async () => {
    try {
      const aclInfo = await client.getBucketACL(config.bucket);
      const acl = aclInfo?.acl || aclInfo?.ACL || 'unknown';
      const details = [`当前 ACL：${acl}`];
      if (acl === 'public-read') {
        details.push('✅ 推荐配置：公共读 + 私有写，适合前端静态资源。');
      } else if (acl === 'private') {
        addRecommendation('将 Bucket 设置为 Public Read，否则浏览器无法直接访问静态资产。');
        return {
          status: 'warn',
          message: 'Bucket 为 private，浏览器直连将失败',
          details,
        };
      } else if (acl === 'public-read-write') {
        addRecommendation('避免 public-read-write，容易被恶意写入。');
        return {
          status: 'warn',
          message: 'Bucket 处于 public-read-write，存在安全风险',
          details,
        };
      }
      return {
        status: 'pass',
        message: 'Bucket ACL 正常 ✅',
        details,
      };
    } catch (error) {
      addRecommendation('确认 AccessKey 具备 GetBucketACL 权限或使用主账号执行。');
      throw new Error(`无法获取 Bucket ACL：${formatOssError(error)}`);
    }
  });

  await runCheck('bucket-referer', '防盗链/Referer 白名单', async () => {
    try {
      const result = await client.getBucketReferer(config.bucket);
      const allowed = result?.RefererList || result?.refererList || [];
      if (!allowed.length || allowed.includes('*')) {
        return {
          status: 'pass',
          message: '未配置 Referer 或允许所有来源',
          details: allowed.length ? [`Referer 白名单：${allowed.join(', ')}`] : undefined,
        };
      }
      addRecommendation('Referer 防盗链限制需要同步前端域名，否则浏览器直连会被拦截。');
      return {
        status: 'warn',
        message: 'Referer 白名单已开启，请确认包含前端域名',
        details: [`当前白名单：${allowed.join(', ')}`],
      };
    } catch (error) {
      if (error?.code === 'NoSuchReferer') {
        return {
          status: 'pass',
          message: '未配置防盗链，默认允许所有 Referer',
        };
      }
      addRecommendation('若需校验 Referer，请在 OSS 控制台 → 防盗链 中确认配置。');
      return {
        status: 'warn',
        message: `无法获取 Referer 配置：${formatOssError(error)}`,
      };
    }
  });

  await runCheck('bucket-cors', 'CORS 规则', async () => {
    try {
      let cors;
      if (typeof client.getBucketCORS === 'function') {
        cors = await client.getBucketCORS(config.bucket);
      } else if (typeof client.getBucketCORSRules === 'function') {
        cors = await client.getBucketCORSRules(config.bucket);
      } else {
        throw new Error('当前 ali-oss 版本不支持读取 CORS，请升级 SDK。');
      }

      const rules =
        cors?.corsRules ||
        cors?.CORSRules ||
        cors?.Rules ||
        cors?.rules ||
        [];
      if (!rules.length) {
        addRecommendation('在 OSS 控制台为 Bucket 添加允许 PUT/GET/HEAD 的 CORS 规则。');
        return {
          status: 'fail',
          message: '未配置 CORS 规则，浏览器直传会被拒绝',
        };
      }

      const hasPut = rules.some((rule) =>
        toArray(rule.AllowedMethod || rule.allowedMethod || rule.AllowedMethods).includes('PUT'),
      );
      const hasWildcard = rules.some((rule) => {
        const origins = toArray(rule.AllowedOrigin || rule.allowedOrigin || rule.AllowedOrigins);
        return origins.includes('*');
      });
      const details = rules.map((rule, idx) => {
        const methods = toArray(rule.AllowedMethod || rule.allowedMethod || rule.AllowedMethods).join(',');
        const origins = toArray(rule.AllowedOrigin || rule.allowedOrigin || rule.AllowedOrigins).join(',');
        return `规则 ${idx + 1}: Methods=${methods || '-'}, Origins=${origins || '-'}`;
      });

      if (!hasPut) {
        addRecommendation('CORS 需允许 PUT 才能上传文件。');
        return {
          status: 'warn',
          message: 'CORS 缺少 PUT 方法',
          details,
        };
      }

      if (!hasWildcard) {
        addRecommendation('建议在调试阶段允许 *，正式环境填写精确域名。');
      }

      return {
        status: 'pass',
        message: 'CORS 规则存在，包含 PUT 方法 ✅',
        details,
      };
    } catch (error) {
      addRecommendation('检查 RAM 权限是否允许 GetBucketCORS。');
      throw new Error(`无法读取 CORS 规则：${formatOssError(error)}`);
    }
  });

  await runCheck('list-objects', '列举对象/读权限验证', async () => {
    try {
      const res = await client.list({ 'max-keys': 5 });
      const objects = res.objects || res.Contents || [];
      return {
        status: 'pass',
        message: `成功列出 ${objects.length} 个对象`,
        details: objects.map((obj) => `${obj.name || obj.Key} (${obj.size || obj.Size || 0} bytes)`),
      };
    } catch (error) {
      addRecommendation('确认 AccessKey 具备 ListObjects 权限（oss:ListObjects）。');
      return {
        status: 'warn',
        message: `无法列出对象：${formatOssError(error)}`,
      };
    }
  });

  let presignResult;
  presignResult = await runCheck('presign-url', '预签名 URL 生成', async () => {
    const key = buildTestKey('presign');
    const url = client.signatureUrl(key, {
      method: 'PUT',
      expires: 300,
      headers: {
        'Content-Type': config.contentType,
      },
    });
    const parsed = new URL(url);
    const expires = parsed.searchParams.get('Expires');
    const accessKey = parsed.searchParams.get('OSSAccessKeyId');
    const signature = parsed.searchParams.get('Signature');

    if (!expires || !accessKey || !signature) {
      addRecommendation('预签名 URL 缺少必要参数，检查后端 signatureUrl 调用逻辑。');
      return {
        status: 'warn',
        message: 'URL 生成成功但缺少关键参数',
        details: [`URL: ${url}`],
      };
    }

    return {
      status: 'pass',
      message: '预签名 URL 生成成功 ✅',
      details: [
        `Host: ${parsed.host}`,
        `Expires: ${expires}`,
        `带签名参数: OSSAccessKeyId / Signature`,
      ],
      meta: { key, url },
    };
  });

  if (!cli.skipUpload && presignResult?.status !== 'fail') {
    await runCheck('upload-test', '真实上传链路测试', async () => {
      if (!presignResult?.meta?.url) {
        return {
          status: 'warn',
          message: '预签名 URL 缺失，跳过上传测试',
        };
      }

      const uploadKey = buildTestKey('deep-diagnose');
      const uploadUrl = client.signatureUrl(uploadKey, {
        method: 'PUT',
        expires: 300,
        headers: {
          'Content-Type': config.contentType,
        },
      });

      const fetchImpl = await ensureFetch();
      const body = Buffer.from(`diagnostic-${Date.now()}`);
      const response = await fetchImpl(uploadUrl, {
        method: 'PUT',
        body,
        headers: {
          'Content-Type': config.contentType,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const ossError = parseOssErrorXml(errorText);
        let signatureAnalysis;
        if (ossError?.code === 'SignatureDoesNotMatch') {
          signatureAnalysis = analyzeSignatureMismatch({
            ossError,
            uploadUrl,
            method: 'PUT',
            contentType: config.contentType,
            bucket: config.bucket,
          });
          addRecommendation('预签名上传签名不匹配，请根据 StringToSign 差异检查后台签名逻辑。');
          if (signatureAnalysis?.hints?.length) {
            signatureAnalysis.hints.forEach((hint) => addRecommendation(hint));
          }
        }
        addRecommendation('根据响应中的 XML Code 在 docs/OSS_DETAILED_CONFIG_GUIDE.md 中对照排查。');
        const details = [];
        if (ossError?.code) details.push(`OSS Code: ${ossError.code}`);
        if (ossError?.message) details.push(`Message: ${ossError.message}`);
        if (ossError?.requestId) details.push(`RequestId: ${ossError.requestId}`);
        if (signatureAnalysis) {
          details.push('--- 签名差异 ---');
          if (signatureAnalysis.diffs.length) {
            signatureAnalysis.diffs.forEach((diff) => details.push(diff));
          } else {
            details.push('未发现逐行差异，但 StringToSign 仍不匹配。');
          }
          details.push(`OSS 实际 StringToSign:\n${signatureAnalysis.actualString}`);
          details.push(`脚本推测 StringToSign:\n${signatureAnalysis.expectedString}`);
        }
        if (!details.length && errorText) {
          details.push(errorText.slice(0, 500));
        }
        return {
          status: 'fail',
          message: `上传失败：HTTP ${response.status}`,
          details: details.length ? details : undefined,
        };
      }

      await client.head(uploadKey);
      await client.delete(uploadKey);

      return {
        status: 'pass',
        message: '上传 + 读取 + 删除 全流程成功 ✅',
        details: [`测试对象：${uploadKey}`, '已自动删除临时对象'],
      };
    });
  } else if (cli.skipUpload) {
    await runCheck('upload-test', '真实上传链路测试', async () => ({
      status: 'warn',
      message: '已通过 --skip-upload 跳过实际上传',
    }));
  }

  finalize(0);
}

function buildTestKey(suffix) {
  const random = crypto.randomBytes(3).toString('hex');
  const prefix = config.keyPrefix.replace(/^\//, '').replace(/\/$/, '');
  return `${prefix}/${suffix}-${Date.now()}-${random}.txt`;
}

function finalize(exitCode) {
  if (!isJsonMode) {
    const summary = state.checks.reduce(
      (acc, check) => {
        acc[check.status] = (acc[check.status] || 0) + 1;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0 },
    );
    logger.info('\n📊 诊断总结');
    logger.info(
      `   通过: ${summary.pass || 0} | 警告: ${summary.warn || 0} | 失败: ${summary.fail || 0}`,
    );

    if (state.recommendations.size) {
      logger.info('\n🛠 建议处理项（按优先级排序）：');
      Array.from(state.recommendations).forEach((item, idx) => {
        logger.info(`   ${idx + 1}. ${item}`);
      });
      logger.info('\n📖 参考文档：docs/OSS_DETAILED_CONFIG_GUIDE.md、docs/DEEP_DIAGNOSIS_GUIDE.md');
    } else {
      logger.info('\n🎉 未发现需要处理的项，可以放心使用当前配置。');
    }
  } else {
    const payload = {
      config: {
        region: config.region,
        bucket: config.bucket,
        endpoint: config.endpoint,
        keyPrefix: config.keyPrefix,
      },
      checks: state.checks,
      recommendations: Array.from(state.recommendations),
    };
    console.log(JSON.stringify(payload, null, 2));
  }

  if (exitCode) {
    process.exit(exitCode);
  }
}

main().catch((error) => {
  logger.error('脚本执行出现异常：', error?.message || error);
  addRecommendation('检查网络连通性，或在终端中重新运行脚本查看详细堆栈。');
  finalize(1);
});

