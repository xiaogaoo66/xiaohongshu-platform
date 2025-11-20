#!/usr/bin/env node

/**
 * Quick diagnostic tool for OSS presigned URL generation.
 *
 * Usage:
 *   node scripts/diagnose-upload-request.cjs --url https://api.example.com --filename test.png --content-type image/png
 *
 * The script will POST to /api/upload/presigned-url and print whether the server
 * returns the same Content-Type as the client sends, plus other helpful metadata.
 */

const DEFAULT_URL = process.env.UPLOAD_API_URL || 'http://localhost:3333';

const parseArgs = () => {
  return process.argv.slice(2).reduce((acc, curr, idx, all) => {
    if (!curr.startsWith('--')) {
      return acc;
    }
    const key = curr.replace(/^--/, '');
    const value =
      idx + 1 < all.length && !all[idx + 1].startsWith('--') ? all[idx + 1] : 'true';
    acc[key] = value;
    return acc;
  }, /** @type {Record<string, string>} */ ({}));
};

const args = parseArgs();

const baseUrl = args.url || DEFAULT_URL;
const filename = args.filename || 'diagnose.png';
const contentType = args['content-type'] || 'image/png';

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/upload/presigned-url`;

const printDivider = () => console.log('='.repeat(60));

const summarizeResult = (payload, response, durationMs) => {
  const summary = {
    requestContentType: payload.contentType,
    expectedContentType:
      response?.expectedContentType ?? (response?.presignedUrl ? '(null)' : 'N/A'),
    contentTypeMatches:
      response?.expectedContentType === undefined
        ? 'server did not return'
        : response?.expectedContentType === payload.contentType
          ? '✅ yes'
          : '❌ no',
    presignedUrlPresent: response?.presignedUrl ? '✅' : '❌',
    took: `${durationMs.toFixed(0)}ms`,
  };

  printDivider();
  console.log('诊断结果');
  printDivider();
  console.table(summary);

  if (!response?.presignedUrl) {
    console.error('⚠️ 服务器没有返回 presignedUrl，请检查后端日志。');
  } else if (response?.expectedContentType === undefined) {
    console.warn('⚠️ 服务器没有回传 expectedContentType，前端会视为 undefined。');
  } else if (response.expectedContentType !== payload.contentType) {
    console.error('❌ Content-Type 不一致，上传会被前端阻止。');
  } else {
    console.log('✅ Content-Type 一致，可以继续排查前端上传请求。');
  }
};

const main = async () => {
  const fetchImpl =
    typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;

  const payload = { filename, contentType };

  printDivider();
  console.log('OSS 上传体检');
  printDivider();
  console.log('请求目标:', endpoint);
  console.log('请求参数:', payload);

  const startedAt = performance.now();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error('❌ 请求失败：', error?.message || error);
    process.exitCode = 1;
  });

  if (!response) {
    return;
  }

  const durationMs = performance.now() - startedAt;

  if (!response.ok) {
    console.error(`❌ 服务端返回 ${response.status}: ${await response.text()}`);
    process.exitCode = 1;
    return;
  }

  const result = await response.json();

  summarizeResult(payload, result, durationMs);

  printDivider();
  console.log('原始响应:');
  printDivider();
  console.dir(result, { depth: null, colors: true });
};

main().catch((error) => {
  console.error('❌ 诊断脚本异常：', error?.message || error);
  process.exitCode = 1;
});

