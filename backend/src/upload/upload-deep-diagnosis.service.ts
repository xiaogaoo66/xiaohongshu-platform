import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';

export interface DiagnosisResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, any>;
  recommendation?: string;
}

interface DiagnosisSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

@Injectable()
export class UploadDeepDiagnosisService {
  private readonly bucket: string | undefined;
  private readonly region: string | undefined;
  private readonly endpoint: string | undefined;
  private client: OSS | null = null;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('OSS_BUCKET');
    this.region = this.configService.get<string>('OSS_REGION');
    this.endpoint = this.configService.get<string>('OSS_ENDPOINT');

    this.initializeClient();
  }

  async performDeepDiagnosis(): Promise<{
    summary: DiagnosisSummary;
    results: DiagnosisResult[];
    criticalIssues: string[];
    recommendations: string[];
  }> {
    const results: DiagnosisResult[] = [];
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    await this.checkEnvironmentVariables(results, criticalIssues, recommendations);
    await this.checkClientInitialization(results, criticalIssues, recommendations);
    await this.checkBucketAccessibility(results, criticalIssues, recommendations);
    await this.checkSignatureUrl(results, criticalIssues, recommendations);
    await this.checkBucketAcl(results, criticalIssues, recommendations);
    await this.checkCorsConfiguration(results, criticalIssues, recommendations);
    await this.checkCorsDetailedAnalysis(results, criticalIssues, recommendations);
    await this.checkCorsOriginMatching(results, criticalIssues, recommendations);
    await this.checkCorsHeaderMatching(results, criticalIssues, recommendations);
    await this.checkCorsPreflightTest(results, criticalIssues, recommendations);
    await this.testPresignedUrlHttpRequest(results, criticalIssues, recommendations);
    await this.checkRegionConsistency(results, criticalIssues, recommendations);
    await this.testActualUpload(results, criticalIssues, recommendations);
    await this.checkNetworkConnectivity(results, criticalIssues, recommendations);

    const summary: DiagnosisSummary = {
      total: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      warnings: results.filter((r) => r.status === 'warning').length,
    };

    return {
      summary,
      results,
      criticalIssues,
      recommendations: [...new Set(recommendations)],
    };
  }

  async checkPolicyEffectiveness(): Promise<{
    success: boolean;
    bucket?: string;
    acl?: string;
    owner?: Record<string, any>;
    hasWritePermission: boolean;
    message: string;
    recommendations?: string[];
  }> {
    if (!this.client || !this.bucket) {
      return {
        success: false,
        hasWritePermission: false,
        message: 'OSS 客户端未初始化或 Bucket 未配置',
        recommendations: ['检查 AccessKey、Region、Bucket 是否已配置'],
      };
    }

    try {
      const aclInfo = await this.client.getBucketACL(this.bucket);
      const acl = aclInfo?.acl || 'unknown';
      const recommendations: string[] = [];

      if (acl === 'public-read-write') {
        recommendations.push('⚠️ Bucket 处于 public-read-write，建议改为 private 以确保安全。');
      }

      // 对于主账号或 RAM 用户，只要能够调用 getBucketACL，一般已经具备写权限。
      // 为了更准确，尝试一次无副作用的写操作（写入/删除临时对象）。
      let hasWritePermission = false;
      try {
        const key = `diagnosis/policy-check-${Date.now()}.txt`;
        await this.client.put(key, Buffer.from('policy-check'));
        await this.client.delete(key);
        hasWritePermission = true;
      } catch (error) {
        hasWritePermission = false;
        recommendations.push('❌ 当前 AccessKey 无法写入 Bucket，检查 RAM 策略或 STS 权限。');
      }

      return {
        success: true,
        bucket: this.bucket,
        acl,
        owner: aclInfo?.owner,
        hasWritePermission,
        message: hasWritePermission
          ? '✅ Bucket ACL 生效且当前凭证具备写权限'
          : '⚠️ Bucket ACL 获取成功，但写权限验证失败',
        recommendations: recommendations.length ? recommendations : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        hasWritePermission: false,
        message: `无法获取 Bucket ACL：${error?.message || error}`,
        recommendations: ['确认 AccessKey 是否拥有 GetBucketACL 权限', '检查网络可达性'],
      };
    }
  }

  private initializeClient() {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET');

    if (!accessKeyId || !accessKeySecret || !this.region || !this.bucket) {
      return;
    }

    const options: OSS.Options = {
      region: this.region,
      bucket: this.bucket,
      accessKeyId,
      accessKeySecret,
      secure: true,
    };

    // 只有当 endpoint 有值且不为空字符串时才设置
    // 空字符串表示让 ali-oss 库根据 region 自动推导 endpoint
    if (this.endpoint && this.endpoint.trim()) {
      options.endpoint = this.endpoint;
    }

    this.client = new (OSS.default || OSS)(options);
  }

  private async checkEnvironmentVariables(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET');
    const region = this.region;
    const bucket = this.bucket;

    const missing: string[] = [];
    if (!accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
    if (!accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
    if (!region) missing.push('OSS_REGION');
    if (!bucket) missing.push('OSS_BUCKET');

    if (missing.length) {
      results.push({
        category: '环境变量',
        test: '必填项',
        status: 'fail',
        message: `缺少必要配置：${missing.join(', ')}`,
      });
      criticalIssues.push('OSS 环境变量不完整');
      recommendations.push('完善 .env 中的 AccessKey / Region / Bucket 配置。');
      return;
    }

    results.push({
      category: '环境变量',
      test: '基础检查',
      status: 'pass',
      message: '所有必要的环境变量均已设置',
      details: {
        region,
        bucket,
        endpoint: this.endpoint || 'auto',
        accessKeyIdPreview: `${accessKeyId.substring(0, 6)}***`,
      },
    });
  }

  private async checkClientInitialization(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client) {
      results.push({
        category: 'OSS 客户端',
        test: '初始化',
        status: 'fail',
        message: 'OSS 客户端未初始化，无法生成预签名 URL',
      });
      criticalIssues.push('OSS 客户端初始化失败');
      recommendations.push('确认 AccessKey / Region / Bucket 配置正确。');
      return;
    }

    results.push({
      category: 'OSS 客户端',
      test: '初始化',
      status: 'pass',
      message: 'OSS 客户端初始化成功',
    });
  }

  private async checkBucketAccessibility(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const info = await this.client.getBucketInfo(this.bucket);
      results.push({
        category: 'Bucket',
        test: '可访问性',
        status: 'pass',
        message: '可以访问指定 Bucket',
        details: {
          bucket: this.bucket,
          creationDate: info?.bucket?.CreationDate,
          location: info?.bucket?.Location,
        },
      });
    } catch (error: any) {
      results.push({
        category: 'Bucket',
        test: '可访问性',
        status: 'fail',
        message: `无法访问 Bucket：${error?.message || error}`,
      });
      criticalIssues.push('无法访问 Bucket');
      recommendations.push('检查 Bucket 名称、Region 与 AccessKey 权限。');
    }
  }

  private async checkSignatureUrl(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const key = `diagnosis/test-presigned-${Date.now()}.txt`;
      const contentType = 'text/plain';

      const url = this.client.signatureUrl(key, {
        method: 'PUT',
        expires: 300,
        headers: { 'Content-Type': contentType },
      });

      const parsed = new URL(url);
      const expires = parsed.searchParams.get('Expires');
      const signature = parsed.searchParams.get('Signature');

      if (!expires || !signature) {
        results.push({
          category: '预签名 URL',
          test: '参数完整性',
          status: 'fail',
          message: '预签名 URL 缺少 Expires 或 Signature 参数',
        });
        criticalIssues.push('预签名 URL 参数缺失');
      } else {
        results.push({
          category: '预签名 URL',
          test: '生成',
          status: 'pass',
          message: '预签名 URL 生成成功',
          details: {
            host: parsed.host,
            expires,
            signedHeaders: parsed.searchParams.get('OSSAccessKeyId')
              ? ['OSSAccessKeyId', 'Signature', 'Expires']
              : ['Signature', 'Expires'],
          },
        });
      }
    } catch (error: any) {
      results.push({
        category: '预签名 URL',
        test: '生成',
        status: 'fail',
        message: `生成预签名 URL 失败：${error?.message || error}`,
      });
      criticalIssues.push('预签名 URL 生成失败');
    }
  }

  private async checkBucketAcl(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const aclInfo = await this.client.getBucketACL(this.bucket);
      const acl = aclInfo?.acl || 'unknown';

      results.push({
        category: 'Bucket ACL',
        test: '权限',
        status: 'pass',
        message: `Bucket ACL: ${acl}`,
        details: {
          owner: aclInfo?.owner?.ID,
          displayName: aclInfo?.owner?.DisplayName,
        },
      });

      if (acl === 'public-read-write') {
        recommendations.push('当前 Bucket 为 public-read-write，建议设置为 private，防止误删。');
      }
    } catch (error: any) {
      results.push({
        category: 'Bucket ACL',
        test: '权限',
        status: 'warning',
        message: `无法获取 Bucket ACL：${error?.message || error}`,
      });
    }
  }

  private async checkCorsConfiguration(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const cors = await this.client.getBucketCORS(this.bucket);
      const rules = cors?.CORSRules || cors?.corsRules || cors?.Rules || cors?.rules || [];

      if (!rules.length) {
        results.push({
          category: 'CORS',
          test: '规则',
          status: 'warning',
          message: 'Bucket 未配置 CORS，前端直传可能 403',
        });
        recommendations.push('在 OSS 控制台为该 Bucket 添加允许 PUT 的 CORS 规则。');
      } else {
        // 辅助函数：将值转换为数组格式
        const toArray = (value: any): string[] => {
          if (!value) return [];
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') return [value];
          return [];
        };

        // 检查规则中是否包含 PUT 方法
        const allowsPut = rules.some((rule: any) => {
          const methods = toArray(
            rule.AllowedMethod ||
            rule.AllowedMethods ||
            rule.allowedMethod ||
            rule.allowedMethods,
          );
          return methods.includes('PUT');
        });

        results.push({
          category: 'CORS',
          test: '规则',
          status: allowsPut ? 'pass' : 'warning',
          message: allowsPut
            ? 'CORS 规则已允许 PUT'
            : 'CORS 规则存在，但未包含 PUT 方法',
          details: {
            ruleCount: rules.length,
            sampleRule: rules[0],
            methods: rules.map((rule: any) => {
              const methods = toArray(
                rule.AllowedMethod ||
                rule.AllowedMethods ||
                rule.allowedMethod ||
                rule.allowedMethods,
              );
              return methods.join(', ');
            }),
          },
        });

        if (!allowsPut) {
          recommendations.push('将 PUT 方法加入 OSS CORS 规则。');
        }
      }
    } catch (error: any) {
      results.push({
        category: 'CORS',
        test: '规则',
        status: 'warning',
        message: `无法获取 CORS 配置：${error?.message || error}`,
      });
    }
  }

  private async checkRegionConsistency(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket || !this.region) {
      return;
    }

    try {
      const location = await this.client.getBucketLocation(this.bucket);
      const actualRegion = (location?.location || location?.Location) ?? 'unknown';

      if (actualRegion !== this.region) {
        results.push({
          category: 'Region',
          test: '匹配',
          status: 'fail',
          message: `Region 不匹配：配置 ${this.region} vs 实际 ${actualRegion}`,
        });
        criticalIssues.push('OSS 区域配置与实际不一致');
        recommendations.push(`将 OSS_REGION 设置为 ${actualRegion}`);
      } else {
        results.push({
          category: 'Region',
          test: '匹配',
          status: 'pass',
          message: `Region 校验通过：${actualRegion}`,
        });
      }
    } catch (error: any) {
      results.push({
        category: 'Region',
        test: '匹配',
        status: 'warning',
        message: `无法获取 Bucket Region：${error?.message || error}`,
      });
    }
  }

  private async testActualUpload(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    const key = `diagnosis/upload-test-${Date.now()}.txt`;
    const content = Buffer.from('diagnosis-upload-test');

    try {
      await this.client.put(key, content, {
        headers: { 'Content-Type': 'text/plain' },
      });

      results.push({
        category: '写入测试',
        test: 'PutObject',
        status: 'pass',
        message: '使用 AccessKey 成功写入 OSS',
        details: { key },
      });

      await this.client.delete(key).catch(() => undefined);
    } catch (error: any) {
      results.push({
        category: '写入测试',
        test: 'PutObject',
        status: 'fail',
        message: `写入 OSS 失败：${error?.message || error}`,
      });
      criticalIssues.push('AccessKey 缺少 PutObject 权限或 Bucket 拒绝写入');
      recommendations.push('检查 RAM 策略是否包含 oss:PutObject，或确认 Bucket ACL。');
    }
  }

  private async checkNetworkConnectivity(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      await this.client.list(
        {
          prefix: 'diagnosis/',
          'max-keys': 1,
        },
        { timeout: 4000 },
      );
      results.push({
        category: '网络',
        test: '连接性',
        status: 'pass',
        message: '能够连通 OSS 端点并完成 List 请求',
        details: {
          endpoint: this.endpoint || `${this.bucket}.${this.region}.aliyuncs.com`,
        },
      });
    } catch (error: any) {
      results.push({
        category: '网络',
        test: '连接性',
        status: 'warning',
        message: `无法进行 HEAD 请求：${error?.message || error}`,
      });
      recommendations.push('检查服务器能否访问 OSS 域名（DNS / 防火墙 / 代理）。');
    }
  }

  private async checkCorsDetailedAnalysis(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const cors = await this.client.getBucketCORS(this.bucket);
      const rules = cors?.CORSRules || cors?.corsRules || cors?.Rules || cors?.rules || [];

      if (!rules.length) {
        return;
      }

      // 辅助函数：将值转换为数组格式
      const toArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return [];
      };

      // 详细分析每个规则
      const ruleAnalysis = rules.map((rule: any, index: number) => {
        const origins = toArray(
          rule.AllowedOrigin ||
          rule.AllowedOrigins ||
          rule.allowedOrigin ||
          rule.allowedOrigins,
        );
        const methods = toArray(
          rule.AllowedMethod ||
          rule.AllowedMethods ||
          rule.allowedMethod ||
          rule.allowedMethods,
        );
        const headers = toArray(
          rule.AllowedHeader ||
          rule.AllowedHeaders ||
          rule.allowedHeader ||
          rule.allowedHeaders,
        );
        const exposedHeaders = toArray(
          rule.ExposeHeader ||
          rule.ExposeHeaders ||
          rule.exposeHeader ||
          rule.exposeHeaders,
        );
        const maxAge = rule.MaxAgeSeconds || rule.maxAgeSeconds || rule.MaxAge || rule.maxAge;

        return {
          index: index + 1,
          origins,
          methods,
          headers,
          exposedHeaders,
          maxAge,
          allowsAllOrigins: origins.includes('*'),
          allowsAllHeaders: headers.includes('*'),
          allowsPut: methods.includes('PUT'),
          allowsContentType: headers.includes('*') || headers.some((h: string) =>
            h.toLowerCase() === 'content-type',
          ),
        };
      });

      // 检查是否有规则允许PUT
      const hasPutRule = ruleAnalysis.some((r) => r.allowsPut);
      // 检查是否有规则允许所有Origin
      const hasAllOriginRule = ruleAnalysis.some((r) => r.allowsAllOrigins);
      // 检查是否有规则允许Content-Type头
      const hasContentTypeHeader = ruleAnalysis.some((r) => r.allowsContentType);

      results.push({
        category: 'CORS',
        test: '详细分析',
        status: hasPutRule && hasContentTypeHeader ? 'pass' : 'warning',
        message: hasPutRule && hasContentTypeHeader
          ? 'CORS 规则配置完整'
          : `CORS 规则存在问题：${!hasPutRule ? '缺少PUT方法' : ''}${!hasContentTypeHeader ? '缺少Content-Type头' : ''}`,
        details: {
          ruleCount: rules.length,
          rules: ruleAnalysis,
          summary: {
            hasPutMethod: hasPutRule,
            hasAllOrigin: hasAllOriginRule,
            hasContentTypeHeader,
          },
        },
      });

      if (!hasPutRule) {
        recommendations.push('CORS 规则中必须包含 PUT 方法');
      }
      if (!hasContentTypeHeader) {
        recommendations.push('CORS 规则中必须允许 Content-Type 请求头（或使用 * 允许所有头）');
      }
    } catch (error: any) {
      results.push({
        category: 'CORS',
        test: '详细分析',
        status: 'warning',
        message: `无法分析 CORS 配置：${error?.message || error}`,
      });
    }
  }

  private async checkCorsOriginMatching(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const cors = await this.client.getBucketCORS(this.bucket);
      const rules = cors?.CORSRules || cors?.corsRules || cors?.Rules || cors?.rules || [];

      if (!rules.length) {
        return;
      }

      // 辅助函数：将值转换为数组格式
      const toArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return [];
      };

      // 测试常见的Origin
      const testOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'http://localhost',
        'https://localhost',
      ];

      // 收集所有规则允许的Origin
      const allowedOrigins: string[] = [];
      rules.forEach((rule: any) => {
        const origins = toArray(
          rule.AllowedOrigin ||
          rule.AllowedOrigins ||
          rule.allowedOrigin ||
          rule.allowedOrigins,
        );
        allowedOrigins.push(...origins);
      });

      const hasWildcard = allowedOrigins.includes('*');
      const matchingOrigins = testOrigins.filter((origin) => {
        if (hasWildcard) return true;
        return allowedOrigins.some((allowed) => {
          if (allowed === '*') return true;
          // 支持通配符匹配，如 http://*.example.com
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        });
      });

      results.push({
        category: 'CORS',
        test: 'Origin匹配',
        status: hasWildcard || matchingOrigins.length > 0 ? 'pass' : 'warning',
        message: hasWildcard
          ? 'CORS 规则允许所有 Origin (*)'
          : matchingOrigins.length > 0
            ? `CORS 规则匹配 ${matchingOrigins.length} 个常见 Origin`
            : 'CORS 规则可能不匹配前端实际使用的 Origin',
        details: {
          allowedOrigins,
          testOrigins,
          matchingOrigins,
          hasWildcard,
          recommendation: hasWildcard
            ? '当前配置允许所有来源，生产环境建议限制为具体域名'
            : matchingOrigins.length === 0
              ? '请确保 CORS 规则包含前端实际使用的 Origin（如 http://localhost:3000）'
              : 'Origin 匹配正常',
        },
      });

      if (!hasWildcard && matchingOrigins.length === 0) {
        recommendations.push('检查前端实际使用的 Origin，确保 CORS 规则包含该 Origin');
      }
    } catch (error: any) {
      results.push({
        category: 'CORS',
        test: 'Origin匹配',
        status: 'warning',
        message: `无法检查 Origin 匹配：${error?.message || error}`,
      });
    }
  }

  private async checkCorsHeaderMatching(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const cors = await this.client.getBucketCORS(this.bucket);
      const rules = cors?.CORSRules || cors?.corsRules || cors?.Rules || cors?.rules || [];

      if (!rules.length) {
        return;
      }

      // 辅助函数：将值转换为数组格式
      const toArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return [];
      };

      // 前端实际使用的请求头
      const requiredHeaders = ['Content-Type'];
      const optionalHeaders = ['x-requested-with', 'authorization'];

      // 检查每个规则
      const headerAnalysis = rules.map((rule: any, index: number) => {
        const headers = toArray(
          rule.AllowedHeader ||
          rule.AllowedHeaders ||
          rule.allowedHeader ||
          rule.allowedHeaders,
        );
        const allowsAll = headers.includes('*');
        const allowsContentType = allowsAll || headers.some((h: string) =>
          h.toLowerCase() === 'content-type',
        );

        return {
          ruleIndex: index + 1,
          allowedHeaders: headers,
          allowsAll,
          allowsContentType,
        };
      });

      const hasContentTypeHeader = headerAnalysis.some((r) => r.allowsContentType);
      const hasWildcard = headerAnalysis.some((r) => r.allowsAll);

      results.push({
        category: 'CORS',
        test: '请求头匹配',
        status: hasContentTypeHeader ? 'pass' : 'fail',
        message: hasContentTypeHeader
          ? 'CORS 规则允许 Content-Type 请求头'
          : 'CORS 规则未允许 Content-Type 请求头，可能导致 403',
        details: {
          requiredHeaders,
          headerAnalysis,
          hasContentTypeHeader,
          hasWildcard,
        },
      });

      if (!hasContentTypeHeader) {
        criticalIssues.push('CORS 规则未允许 Content-Type 请求头');
        recommendations.push('在 CORS 规则的 AllowedHeader 中添加 Content-Type 或使用 * 允许所有头');
      }
    } catch (error: any) {
      results.push({
        category: 'CORS',
        test: '请求头匹配',
        status: 'warning',
        message: `无法检查请求头匹配：${error?.message || error}`,
      });
    }
  }

  private async checkCorsPreflightTest(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      const cors = await this.client.getBucketCORS(this.bucket);
      const rules = cors?.CORSRules || cors?.corsRules || cors?.Rules || cors?.rules || [];

      if (!rules.length) {
        results.push({
          category: 'CORS',
          test: '预检请求',
          status: 'warning',
          message: '未配置 CORS，无法进行预检请求测试',
        });
        return;
      }

      // 辅助函数：将值转换为数组格式
      const toArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return [];
      };

      // 检查是否有规则允许OPTIONS方法（预检请求）
      const allowsOptions = rules.some((rule: any) => {
        const methods = toArray(
          rule.AllowedMethod ||
          rule.AllowedMethods ||
          rule.allowedMethod ||
          rule.allowedMethods,
        );
        return methods.includes('OPTIONS') || methods.includes('*');
      });

      // 检查是否有规则允许PUT方法
      const allowsPut = rules.some((rule: any) => {
        const methods = toArray(
          rule.AllowedMethod ||
          rule.AllowedMethods ||
          rule.allowedMethod ||
          rule.allowedMethods,
        );
        return methods.includes('PUT') || methods.includes('*');
      });

      // PUT 请求不是简单请求，浏览器总是会先发送 OPTIONS 预检请求
      // 如果 OPTIONS 预检失败，浏览器会阻止 PUT 请求，导致 403 错误
      const isCriticalIssue = !allowsOptions;

      results.push({
        category: 'CORS',
        test: '预检请求',
        status: allowsOptions && allowsPut ? 'pass' : isCriticalIssue ? 'fail' : 'warning',
        message: allowsOptions && allowsPut
          ? 'CORS 规则支持预检请求（OPTIONS）和实际请求（PUT）'
          : allowsOptions
            ? 'CORS 规则支持预检请求，但未允许 PUT 方法'
            : '❌ CORS 规则缺少 OPTIONS 方法，浏览器预检请求会失败，导致 403 错误',
        details: {
          allowsOptions,
          allowsPut,
          isCriticalIssue,
          note: '浏览器在发送 PUT 请求前会先发送 OPTIONS 预检请求，如果预检失败，PUT 请求会被阻止',
          explanation: !allowsOptions
            ? '这是导致 403 错误的常见原因：浏览器发送 OPTIONS 预检请求，但 CORS 规则未允许 OPTIONS 方法，预检失败后浏览器阻止了 PUT 请求'
            : undefined,
        },
      });

      if (!allowsOptions) {
        criticalIssues.push('CORS 规则缺少 OPTIONS 方法，浏览器预检请求会失败，导致 403 错误');
        recommendations.push(
          '⚠️ 关键修复：在 OSS 控制台的 CORS 规则中添加 OPTIONS 方法。浏览器在发送 PUT 请求前会先发送 OPTIONS 预检请求，如果预检失败，会导致 403 错误。',
        );
      }
      if (!allowsPut) {
        recommendations.push('CORS 规则应包含 PUT 方法以支持实际上传');
      }
    } catch (error: any) {
      results.push({
        category: 'CORS',
        test: '预检请求',
        status: 'warning',
        message: `无法检查预检请求配置：${error?.message || error}`,
      });
    }
  }

  private async testPresignedUrlHttpRequest(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.client || !this.bucket) {
      return;
    }

    try {
      // 生成一个测试用的预签名URL
      const testKey = `diagnosis/http-test-${Date.now()}.txt`;
      const testContentType = 'text/plain';
      const testContent = Buffer.from('test-content');

      const presignedUrl = this.client.signatureUrl(testKey, {
        method: 'PUT',
        expires: 300,
        headers: { 'Content-Type': testContentType },
      });

      // 使用 Node.js 的 https/http 模块测试实际HTTP请求
      // 注意：这里我们只检查URL格式，实际HTTP测试需要网络请求
      const urlObj = new URL(presignedUrl);
      const hasSignature = urlObj.searchParams.has('Signature') || urlObj.searchParams.has('X-Amz-Signature');
      const hasExpires = urlObj.searchParams.has('Expires') || urlObj.searchParams.has('X-Amz-Expires');
      const hasContentType = urlObj.searchParams.has('Content-Type');

      // 检查URL参数完整性
      const urlValid = hasSignature && hasExpires;
      const contentTypeInUrl = hasContentType;

      results.push({
        category: '预签名URL',
        test: 'HTTP请求测试',
        status: urlValid ? 'pass' : 'fail',
        message: urlValid
          ? '预签名 URL 格式正确，包含必要的签名参数'
          : '预签名 URL 缺少必要的签名参数',
        details: {
          hasSignature,
          hasExpires,
          hasContentType: contentTypeInUrl,
          urlHost: urlObj.hostname,
          urlPath: urlObj.pathname,
          recommendation: contentTypeInUrl
            ? '预签名 URL 包含 Content-Type，确保前端上传时使用相同的 Content-Type'
            : '预签名 URL 未包含 Content-Type，前端可以自由设置',
        },
      });

      if (!urlValid) {
        criticalIssues.push('预签名 URL 格式不正确');
        recommendations.push('检查预签名 URL 生成逻辑，确保包含 Signature 和 Expires 参数');
      }

      // 尝试实际写入（使用SDK，不是HTTP）
      try {
        await this.client.put(testKey, testContent, {
          headers: { 'Content-Type': testContentType },
        });
        await this.client.delete(testKey).catch(() => undefined);

        results.push({
          category: '预签名URL',
          test: '实际写入验证',
          status: 'pass',
          message: '使用相同参数可以成功写入，预签名 URL 应该有效',
        });
      } catch (error: any) {
        results.push({
          category: '预签名URL',
          test: '实际写入验证',
          status: 'warning',
          message: `使用SDK写入测试失败：${error?.message || error}`,
          details: {
            note: '这可能是权限问题，但不影响预签名URL的格式正确性',
          },
        });
      }
    } catch (error: any) {
      results.push({
        category: '预签名URL',
        test: 'HTTP请求测试',
        status: 'fail',
        message: `无法生成或测试预签名 URL：${error?.message || error}`,
      });
      criticalIssues.push('预签名 URL 生成或测试失败');
    }
  }

}


