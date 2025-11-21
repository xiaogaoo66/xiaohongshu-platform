#!/usr/bin/env node

/**
 * Quick diagnostic tool for OSS presigned URL generation.
 *
 * Usage:
 *   node scripts/diagnose-upload-request.cjs --url https://api.example.com --filename test.png --content-type image/png [--token <JWT>]
 *
 * The script will POST to /api/upload/presigned-url and print whether the server
 * returns the same Content-Type as the client sends, plus other helpful metadata.
 */

const DEFAULT_URL = process.env.UPLOAD_API_URL || 'http://localhost:3333';

const parseArgs = () => {
  /** @type {{ _: string[] } & Record<string, string>} */
  const parsed = { _: [] };
  const tokens = process.argv.slice(2);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '--') {
      continue;
    }

    if (token.startsWith('--')) {
      const withoutPrefix = token.replace(/^--/, '');
      const [key, inlineValue] = withoutPrefix.split('=');

      if (inlineValue !== undefined) {
        parsed[key] = inlineValue;
        continue;
      }

      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        parsed[key] = tokens[i + 1];
        i++;
        continue;
      }

      parsed[key] = 'true';
      continue;
    }

    parsed._.push(token);
  }

  return parsed;
};

const args = parseArgs();

const positionalUrl = args._[0];
const positionalContentType = args._[1];
const positionalFilename = args._[2];

const baseUrl = args.url || args.baseUrl || positionalUrl || DEFAULT_URL;
const filename = args.filename || positionalFilename || 'diagnose.png';
const contentType =
  args['content-type'] || args.contentType || positionalContentType || 'image/png';
const authToken = args.token || args.auth || process.env.UPLOAD_API_TOKEN;

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
  console.log('附带 Authorization 头:', authToken ? '✅ 是' : '❌ 否');

  const startedAt = performance.now();
  const headers = { 'Content-Type': 'application/json' };

  if (authToken) {
    headers.Authorization = authToken.startsWith('Bearer ')
      ? authToken
      : `Bearer ${authToken}`;
  }

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
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

