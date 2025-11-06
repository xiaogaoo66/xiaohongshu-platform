import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

interface DiagnosisResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  recommendation?: string;
}

@Injectable()
export class UploadDeepDiagnosisService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');

    if (accessKeyId && secretAccessKey && region) {
      this.s3 = new AWS.S3({
        accessKeyId,
        secretAccessKey,
        region,
        signatureVersion: 'v4',
        s3ForcePathStyle: false,
      });
    }
  }

  async performDeepDiagnosis(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
    };
    results: DiagnosisResult[];
    criticalIssues: string[];
    recommendations: string[];
  }> {
    const results: DiagnosisResult[] = [];
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // 1. 环境变量深度检查
    await this.checkEnvironmentVariables(results, criticalIssues, recommendations);

    // 2. AWS SDK 配置检查
    await this.checkSDKConfiguration(results, criticalIssues, recommendations);

    // 3. 预签名URL签名算法检查
    await this.checkPresignedUrlSignature(results, criticalIssues, recommendations);

    // 4. 请求头匹配检查
    await this.checkHeaderMatching(results, criticalIssues, recommendations);

    // 5. 时间同步检查
    await this.checkTimeSync(results, criticalIssues, recommendations);

    // 6. 存储桶策略深度检查
    await this.checkBucketPolicy(results, criticalIssues, recommendations);

    // 7. CORS配置检查
    await this.checkCORSConfiguration(results, criticalIssues, recommendations);

    // 8. 区域配置检查
    await this.checkRegionConfiguration(results, criticalIssues, recommendations);

    // 9. URL编码问题检查
    await this.checkURLEncoding(results, criticalIssues, recommendations);

    // 10. 实际文件上传测试
    await this.testActualUpload(results, criticalIssues, recommendations);

    // 11. 网络连接检查
    await this.checkNetworkConnectivity(results, criticalIssues, recommendations);

    // 12. 签名版本检查
    await this.checkSignatureVersion(results, criticalIssues, recommendations);

    // 统计
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
    };

    return {
      summary,
      results,
      criticalIssues,
      recommendations: [...new Set(recommendations)], // 去重
    };
  }

  private async checkEnvironmentVariables(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    // 检查是否存在
    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      results.push({
        category: '环境变量',
        test: '环境变量完整性',
        status: 'fail',
        message: '缺少必要的环境变量',
        details: {
          hasAccessKeyId: !!accessKeyId,
          hasSecretAccessKey: !!secretAccessKey,
          hasRegion: !!region,
          hasBucket: !!bucket,
        },
      });
      criticalIssues.push('环境变量配置不完整');
      return;
    }

    // 检查格式
    const accessKeyIdPattern = /^AKIA[0-9A-Z]{16}$/;
    const regionPattern = /^[a-z0-9-]+$/;
    const bucketPattern = /^[a-z0-9.-]+$/;

    if (!accessKeyIdPattern.test(accessKeyId)) {
      results.push({
        category: '环境变量',
        test: 'Access Key ID 格式',
        status: 'fail',
        message: `Access Key ID 格式不正确: ${accessKeyId.substring(0, 8)}...`,
        details: {
          expectedFormat: 'AKIA + 16位大写字母和数字',
          actual: accessKeyId.substring(0, 12) + '...',
        },
      });
      criticalIssues.push('Access Key ID 格式错误');
    }

    if (secretAccessKey.length < 40) {
      results.push({
        category: '环境变量',
        test: 'Secret Access Key 长度',
        status: 'warning',
        message: `Secret Access Key 长度异常: ${secretAccessKey.length} 字符`,
        details: {
          expectedLength: '40+ 字符',
          actualLength: secretAccessKey.length,
        },
      });
    }

    if (!regionPattern.test(region)) {
      results.push({
        category: '环境变量',
        test: 'Region 格式',
        status: 'fail',
        message: `Region 格式不正确: ${region}`,
        details: {
          expectedFormat: '小写字母、数字和连字符',
          actual: region,
        },
      });
      criticalIssues.push('Region 格式错误');
    }

    if (!bucketPattern.test(bucket)) {
      results.push({
        category: '环境变量',
        test: 'Bucket 名称格式',
        status: 'warning',
        message: `Bucket 名称可能包含无效字符: ${bucket}`,
        details: {
          expectedFormat: '小写字母、数字、点和连字符',
          actual: bucket,
        },
      });
    }

    results.push({
      category: '环境变量',
      test: '环境变量基础检查',
      status: 'pass',
      message: '所有必要的环境变量都已配置',
    });
  }

  private async checkSDKConfiguration(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      results.push({
        category: 'SDK配置',
        test: 'S3 客户端初始化',
        status: 'fail',
        message: 'S3 客户端未初始化',
      });
      criticalIssues.push('S3 客户端未初始化');
      return;
    }

    const config = this.s3.config;
    const region = config.region;
    const signatureVersion = config.signatureVersion;

    if (signatureVersion !== 'v4') {
      results.push({
        category: 'SDK配置',
        test: '签名版本',
        status: 'fail',
        message: `签名版本不正确: ${signatureVersion}，应该是 v4`,
        details: {
          current: signatureVersion,
          expected: 'v4',
        },
      });
      criticalIssues.push('签名版本不是 v4');
      recommendations.push('确保 AWS SDK 配置中使用 signatureVersion: "v4"');
    } else {
      results.push({
        category: 'SDK配置',
        test: '签名版本',
        status: 'pass',
        message: '签名版本正确 (v4)',
      });
    }

    if (config.s3ForcePathStyle) {
      results.push({
        category: 'SDK配置',
        test: '路径样式',
        status: 'warning',
        message: '使用了路径样式 (s3ForcePathStyle: true)，可能影响 URL 格式',
        details: {
          s3ForcePathStyle: config.s3ForcePathStyle,
        },
      });
      recommendations.push('如果使用虚拟主机样式，设置 s3ForcePathStyle: false');
    }

    results.push({
      category: 'SDK配置',
      test: 'SDK 配置检查',
      status: 'pass',
      message: `SDK 配置正常，区域: ${region}`,
    });
  }

  private async checkPresignedUrlSignature(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const testKey = 'diagnosis/test-presigned-url.txt';
      const testContentType = 'text/plain';

      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: testKey,
        ContentType: testContentType,
        Expires: 300,
      } as any);

      // 解析URL
      const url = new URL(presignedUrl);
      const params = url.searchParams;

      // 检查必需的签名参数
      const requiredParams = [
        'X-Amz-Algorithm',
        'X-Amz-Credential',
        'X-Amz-Date',
        'X-Amz-Expires',
        'X-Amz-SignedHeaders',
        'X-Amz-Signature',
      ];

      const missingParams: string[] = [];
      for (const param of requiredParams) {
        if (!params.has(param)) {
          missingParams.push(param);
        }
      }

      if (missingParams.length > 0) {
        results.push({
          category: '预签名URL',
          test: '签名参数完整性',
          status: 'fail',
          message: `缺少必需的签名参数: ${missingParams.join(', ')}`,
          details: {
            missingParams,
            allParams: Array.from(params.keys()),
          },
        });
        criticalIssues.push('预签名URL缺少必需的签名参数');
      } else {
        results.push({
          category: '预签名URL',
          test: '签名参数完整性',
          status: 'pass',
          message: '所有必需的签名参数都存在',
        });
      }

      // 检查 Content-Type 是否在签名中
      const signedHeaders = params.get('X-Amz-SignedHeaders') || '';
      if (!signedHeaders.includes('content-type')) {
        results.push({
          category: '预签名URL',
          test: 'Content-Type 签名',
          status: 'warning',
          message: 'Content-Type 未包含在签名头中，可能导致上传时签名验证失败',
          details: {
            signedHeaders,
            contentType: testContentType,
          },
        });
        recommendations.push('确保 Content-Type 包含在 X-Amz-SignedHeaders 中');
      } else {
        results.push({
          category: '预签名URL',
          test: 'Content-Type 签名',
          status: 'pass',
          message: 'Content-Type 已包含在签名头中',
        });
      }

      // 检查 URL 中的 Content-Type 参数
      const urlContentType = params.get('Content-Type');
      if (urlContentType !== testContentType) {
        results.push({
          category: '预签名URL',
          test: 'URL中的Content-Type',
          status: 'fail',
          message: `URL中的Content-Type与请求的不匹配: ${urlContentType} vs ${testContentType}`,
          details: {
            urlContentType,
            requestedContentType: testContentType,
          },
        });
        criticalIssues.push('预签名URL中的Content-Type不匹配');
      } else {
        results.push({
          category: '预签名URL',
          test: 'URL中的Content-Type',
          status: 'pass',
          message: 'URL中的Content-Type正确',
        });
      }

      // 检查签名算法
      const algorithm = params.get('X-Amz-Algorithm');
      if (algorithm !== 'AWS4-HMAC-SHA256') {
        results.push({
          category: '预签名URL',
          test: '签名算法',
          status: 'fail',
          message: `签名算法不正确: ${algorithm}`,
          details: {
            current: algorithm,
            expected: 'AWS4-HMAC-SHA256',
          },
        });
        criticalIssues.push('签名算法不正确');
      } else {
        results.push({
          category: '预签名URL',
          test: '签名算法',
          status: 'pass',
          message: '签名算法正确 (AWS4-HMAC-SHA256)',
        });
      }

      // 检查过期时间
      const expires = parseInt(params.get('X-Amz-Expires') || '0', 10);
      if (expires !== 300) {
        results.push({
          category: '预签名URL',
          test: '过期时间',
          status: 'warning',
          message: `过期时间不匹配: ${expires} 秒，期望 300 秒`,
          details: {
            actual: expires,
            expected: 300,
          },
        });
      }

      results.push({
        category: '预签名URL',
        test: '预签名URL生成',
        status: 'pass',
        message: '预签名URL生成成功',
        details: {
          urlLength: presignedUrl.length,
          host: url.hostname,
        },
      });
    } catch (error: any) {
      results.push({
        category: '预签名URL',
        test: '预签名URL生成',
        status: 'fail',
        message: `生成预签名URL失败: ${error.message}`,
        details: {
          error: error.code || error.name,
          message: error.message,
        },
      });
      criticalIssues.push('无法生成预签名URL');
    }
  }

  private async checkHeaderMatching(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const testKey = 'diagnosis/test-headers.txt';
      const testContentType = 'image/jpeg';

      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: testKey,
        ContentType: testContentType,
        Expires: 300,
      } as any);

      const url = new URL(presignedUrl);
      const params = url.searchParams;
      const signedHeaders = params.get('X-Amz-SignedHeaders') || '';

      // 分析签名头
      const signedHeadersList = signedHeaders.split(';');
      const hasContentType = signedHeadersList.includes('content-type');

      results.push({
        category: '请求头匹配',
        test: '签名头分析',
        status: hasContentType ? 'pass' : 'warning',
        message: `签名头: ${signedHeaders}`,
        details: {
          signedHeadersList,
          hasContentType,
          contentTypeInUrl: params.get('Content-Type'),
        },
      });

      if (!hasContentType) {
        recommendations.push(
          '前端上传时必须使用与预签名URL中完全相同的Content-Type，且不能添加其他请求头',
        );
      }

      // 检查大小写敏感性
      const contentTypeInUrl = params.get('Content-Type');
      if (contentTypeInUrl && contentTypeInUrl !== testContentType) {
        results.push({
          category: '请求头匹配',
          test: 'Content-Type 匹配',
          status: 'fail',
          message: `Content-Type 不匹配: ${contentTypeInUrl} vs ${testContentType}`,
          details: {
            urlContentType: contentTypeInUrl,
            requestedContentType: testContentType,
          },
        });
        criticalIssues.push('Content-Type 不匹配');
      }
    } catch (error: any) {
      results.push({
        category: '请求头匹配',
        test: '请求头检查',
        status: 'fail',
        message: `检查请求头失败: ${error.message}`,
      });
    }
  }

  private async checkTimeSync(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    try {
      // 获取服务器时间
      const serverTime = new Date();
      const serverTimeMs = serverTime.getTime();

      // 尝试从AWS获取时间（通过检查预签名URL中的日期）
      if (this.s3) {
        const bucket = this.configService.get<string>('AWS_S3_BUCKET');
        const testUrl = await this.s3.getSignedUrlPromise('putObject', {
          Bucket: bucket,
          Key: 'test',
          Expires: 300,
        } as any);

        const url = new URL(testUrl);
        const amzDate = url.searchParams.get('X-Amz-Date');
        if (amzDate) {
          // 解析AWS日期 (格式: YYYYMMDDTHHmmssZ)
          const awsYear = parseInt(amzDate.substring(0, 4), 10);
          const awsMonth = parseInt(amzDate.substring(4, 6), 10) - 1;
          const awsDay = parseInt(amzDate.substring(6, 8), 10);
          const awsHour = parseInt(amzDate.substring(9, 11), 10);
          const awsMinute = parseInt(amzDate.substring(11, 13), 10);
          const awsSecond = parseInt(amzDate.substring(13, 15), 10);

          const awsTime = new Date(
            Date.UTC(awsYear, awsMonth, awsDay, awsHour, awsMinute, awsSecond),
          );
          const timeDiff = Math.abs(serverTime.getTime() - awsTime.getTime());

          if (timeDiff > 5 * 60 * 1000) {
            // 5分钟
            results.push({
              category: '时间同步',
              test: '服务器时间同步',
              status: 'fail',
              message: `服务器时间与AWS时间差异过大: ${Math.round(timeDiff / 1000 / 60)} 分钟`,
              details: {
                serverTime: serverTime.toISOString(),
                awsTime: awsTime.toISOString(),
                differenceMinutes: Math.round(timeDiff / 1000 / 60),
              },
            });
            criticalIssues.push('服务器时间不同步');
            recommendations.push('确保服务器时间与AWS时间同步（差异应在5分钟内）');
          } else {
            results.push({
              category: '时间同步',
              test: '服务器时间同步',
              status: 'pass',
              message: `时间同步正常，差异: ${Math.round(timeDiff / 1000)} 秒`,
            });
          }
        }
      }
    } catch (error: any) {
      results.push({
        category: '时间同步',
        test: '时间同步检查',
        status: 'warning',
        message: `无法检查时间同步: ${error.message}`,
      });
    }
  }

  private async checkBucketPolicy(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');

      // 尝试获取存储桶策略
      try {
        const policy = await this.s3.getBucketPolicy({ Bucket: bucket }).promise();
        const policyDoc = JSON.parse(policy.Policy || '{}');

        results.push({
          category: '存储桶策略',
          test: '存储桶策略存在',
          status: 'pass',
          message: '存储桶策略已配置',
          details: {
            policyStatements: policyDoc.Statement?.length || 0,
          },
        });

        // 详细分析策略中的 Actions
        const statements = policyDoc.Statement || [];
        const allActions: string[] = [];
        const allPrincipals: string[] = [];
        
        statements.forEach((stmt: any) => {
          if (stmt.Effect === 'Allow') {
            // 收集所有 Actions
            if (Array.isArray(stmt.Action)) {
              allActions.push(...stmt.Action);
            } else if (stmt.Action) {
              allActions.push(stmt.Action);
            }
            
            // 收集所有 Principals
            if (stmt.Principal) {
              if (typeof stmt.Principal === 'string') {
                allPrincipals.push(stmt.Principal);
              } else if (stmt.Principal['*']) {
                allPrincipals.push('*');
              } else if (typeof stmt.Principal === 'object') {
                Object.keys(stmt.Principal).forEach(key => allPrincipals.push(key));
              }
            }
          }
        });

        // 检查是否有 PutObject 权限
        const hasPutObject = allActions.some(
          (action) =>
            action === 's3:PutObject' ||
            action === 's3:PutObject*' ||
            action === 's3:*' ||
            (typeof action === 'string' && action.includes('PutObject')),
        );

        // 检查是否有 GetObject 权限
        const hasGetObject = allActions.some(
          (action) =>
            action === 's3:GetObject' ||
            action === 's3:GetObject*' ||
            action === 's3:*' ||
            (typeof action === 'string' && action.includes('GetObject')),
        );

        // 详细报告策略内容
        results.push({
          category: '存储桶策略',
          test: '策略 Actions 分析',
          status: 'pass',
          message: `策略包含 ${allActions.length} 个操作`,
          details: {
            actions: allActions,
            principals: allPrincipals,
            hasGetObject,
            hasPutObject,
          },
        });

        if (!hasPutObject) {
          results.push({
            category: '存储桶策略',
            test: 'PutObject 权限',
            status: 'fail',
            message: '❌ 存储桶策略中没有 s3:PutObject 权限！当前策略只允许读取（GetObject），不允许上传',
            details: {
              currentActions: allActions,
              missingAction: 's3:PutObject',
              recommendation: '需要在存储桶策略中添加 s3:PutObject 权限，或者确保IAM用户有足够的权限',
            },
          });
          criticalIssues.push('存储桶策略缺少 s3:PutObject 权限');
          recommendations.push(
            '在存储桶策略中添加 s3:PutObject 权限。示例：在 Statement 中添加 {"Effect": "Allow", "Principal": {"AWS": "arn:aws:iam::YOUR_ACCOUNT:user/YOUR_USER"}, "Action": "s3:PutObject", "Resource": "arn:aws:s3:::YOUR_BUCKET/*"}',
          );
        } else {
          results.push({
            category: '存储桶策略',
            test: 'PutObject 权限',
            status: 'pass',
            message: '✅ 存储桶策略包含 s3:PutObject 权限',
          });
        }

        // 如果只有 GetObject，给出明确警告
        if (hasGetObject && !hasPutObject) {
          results.push({
            category: '存储桶策略',
            test: '策略权限分析',
            status: 'fail',
            message: '⚠️ 存储桶策略配置问题：只有读取权限，没有上传权限',
            details: {
              problem: '策略只允许 s3:GetObject（下载），不允许 s3:PutObject（上传）',
              impact: '这可能导致预签名URL上传失败，即使IAM用户有权限',
              solution: '需要修改存储桶策略，添加 s3:PutObject 权限',
            },
          });
        }
      } catch (error: any) {
        if (error.code === 'NoSuchBucketPolicy') {
          results.push({
            category: '存储桶策略',
            test: '存储桶策略',
            status: 'warning',
            message: '存储桶策略未配置（可能依赖IAM策略）',
          });
        } else {
          results.push({
            category: '存储桶策略',
            test: '存储桶策略检查',
            status: 'warning',
            message: `无法检查存储桶策略: ${error.code || error.message}`,
          });
        }
      }

      // 检查存储桶是否存在
      try {
        await this.s3.headBucket({ Bucket: bucket }).promise();
        results.push({
          category: '存储桶策略',
          test: '存储桶访问',
          status: 'pass',
          message: '可以访问存储桶',
        });
      } catch (error: any) {
        results.push({
          category: '存储桶策略',
          test: '存储桶访问',
          status: 'fail',
          message: `无法访问存储桶: ${error.code || error.message}`,
          details: {
            errorCode: error.code,
            errorMessage: error.message,
          },
        });
        criticalIssues.push('无法访问存储桶');
      }
    } catch (error: any) {
      results.push({
        category: '存储桶策略',
        test: '存储桶策略检查',
        status: 'fail',
        message: `检查存储桶策略失败: ${error.message}`,
      });
    }
  }

  private async checkCORSConfiguration(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');

      try {
        const cors = await this.s3.getBucketCors({ Bucket: bucket }).promise();
        const corsRules = cors.CORSRules || [];

        if (corsRules.length === 0) {
          results.push({
            category: 'CORS配置',
            test: 'CORS规则',
            status: 'warning',
            message: '存储桶未配置CORS规则',
          });
          recommendations.push('如果前端直接上传到S3，需要配置CORS规则');
        } else {
          // 检查是否允许PUT方法
          const hasPutMethod = corsRules.some((rule: any) =>
            rule.AllowedMethods?.includes('PUT'),
          );

          if (!hasPutMethod) {
            results.push({
              category: 'CORS配置',
              test: 'PUT方法',
              status: 'warning',
              message: 'CORS规则中可能没有允许PUT方法',
              details: {
                corsRules: corsRules.length,
              },
            });
            recommendations.push('确保CORS规则允许PUT方法');
          } else {
            results.push({
              category: 'CORS配置',
              test: 'PUT方法',
              status: 'pass',
              message: 'CORS规则允许PUT方法',
            });
          }

          // 检查允许的来源
          const allowedOrigins = corsRules.flatMap((rule: any) => rule.AllowedOrigins || []);
          if (allowedOrigins.length === 0) {
            results.push({
              category: 'CORS配置',
              test: '允许的来源',
              status: 'warning',
              message: 'CORS规则中未配置允许的来源',
            });
          }

          results.push({
            category: 'CORS配置',
            test: 'CORS规则',
            status: 'pass',
            message: `CORS规则已配置，规则数: ${corsRules.length}`,
            details: {
              rules: corsRules.length,
              allowedOrigins,
            },
          });
        }
      } catch (error: any) {
        if (error.code === 'NoSuchCORSConfiguration') {
          results.push({
            category: 'CORS配置',
            test: 'CORS配置',
            status: 'warning',
            message: '存储桶未配置CORS（如果使用预签名URL，可能不需要）',
          });
        } else {
          results.push({
            category: 'CORS配置',
            test: 'CORS配置检查',
            status: 'warning',
            message: `无法检查CORS配置: ${error.code || error.message}`,
          });
        }
      }
    } catch (error: any) {
      results.push({
        category: 'CORS配置',
        test: 'CORS配置检查',
        status: 'warning',
        message: `检查CORS配置失败: ${error.message}`,
      });
    }
  }

  private async checkRegionConfiguration(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const configuredRegion = this.configService.get<string>('AWS_REGION');

      // 获取存储桶的实际区域
      try {
        const location = await this.s3.getBucketLocation({ Bucket: bucket }).promise();
        const actualRegion = location.LocationConstraint || 'us-east-1'; // us-east-1 返回 null

        if (actualRegion !== configuredRegion) {
          results.push({
            category: '区域配置',
            test: '区域匹配',
            status: 'fail',
            message: `区域不匹配: 配置的 ${configuredRegion} vs 实际的 ${actualRegion}`,
            details: {
              configured: configuredRegion,
              actual: actualRegion,
            },
          });
          criticalIssues.push('存储桶区域与配置不匹配');
          recommendations.push(`将 AWS_REGION 环境变量更新为 ${actualRegion}`);
        } else {
          results.push({
            category: '区域配置',
            test: '区域匹配',
            status: 'pass',
            message: `区域匹配: ${actualRegion}`,
          });
        }
      } catch (error: any) {
        results.push({
          category: '区域配置',
          test: '区域检查',
          status: 'warning',
          message: `无法获取存储桶区域: ${error.code || error.message}`,
        });
      }
    } catch (error: any) {
      results.push({
        category: '区域配置',
        test: '区域配置检查',
        status: 'fail',
        message: `检查区域配置失败: ${error.message}`,
      });
    }
  }

  private async checkURLEncoding(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      // 测试特殊字符的文件名
      const testKey = 'diagnosis/test file with spaces & special chars.txt';
      const testContentType = 'text/plain';

      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: testKey,
        ContentType: testContentType,
        Expires: 300,
      } as any);

      const url = new URL(presignedUrl);
      const keyInUrl = url.pathname.substring(1); // 移除前导斜杠

      // 检查URL编码
      if (keyInUrl !== encodeURIComponent(testKey).replace(/%2F/g, '/')) {
        results.push({
          category: 'URL编码',
          test: '文件名编码',
          status: 'warning',
          message: '文件名在URL中的编码可能不正确',
          details: {
            original: testKey,
            inUrl: keyInUrl,
            expected: encodeURIComponent(testKey).replace(/%2F/g, '/'),
          },
        });
        recommendations.push('确保文件名在URL中正确编码');
      } else {
        results.push({
          category: 'URL编码',
          test: '文件名编码',
          status: 'pass',
          message: '文件名编码正确',
        });
      }
    } catch (error: any) {
      results.push({
        category: 'URL编码',
        test: 'URL编码检查',
        status: 'warning',
        message: `检查URL编码失败: ${error.message}`,
      });
    }
  }

  private async testActualUpload(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const testKey = `diagnosis/test-upload-${Date.now()}.txt`;
      const testContent = 'This is a test upload from diagnosis service';
      const testContentType = 'text/plain';

      // 生成预签名URL
      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: testKey,
        ContentType: testContentType,
        Expires: 300,
      } as any);

      // 尝试实际上传（使用 AWS SDK 直接上传来验证权限）
      try {
        await this.s3
          .putObject({
            Bucket: bucket,
            Key: testKey,
            Body: testContent,
            ContentType: testContentType,
          })
          .promise();

        results.push({
          category: '实际上传测试',
          test: '文件上传（直接）',
          status: 'pass',
          message: '直接上传测试成功（使用AWS SDK）',
          details: {
            method: 'AWS SDK putObject',
          },
        });

        // 清理测试文件
        try {
          await this.s3.deleteObject({ Bucket: bucket, Key: testKey }).promise();
        } catch (e) {
          // 忽略清理错误
        }

        // 测试预签名URL上传（如果环境支持fetch）
        try {
          // 检查是否支持fetch（Node.js 18+）
          if (typeof fetch !== 'undefined') {
            const response = await fetch(presignedUrl, {
              method: 'PUT',
              body: testContent,
              headers: {
                'Content-Type': testContentType,
              },
            });

            if (response.ok) {
              results.push({
                category: '实际上传测试',
                test: '文件上传（预签名URL）',
                status: 'pass',
                message: '预签名URL上传测试成功',
                details: {
                  status: response.status,
                  statusText: response.statusText,
                },
              });

              // 清理测试文件
              try {
                await this.s3.deleteObject({ Bucket: bucket, Key: testKey }).promise();
              } catch (e) {
                // 忽略清理错误
              }
            } else {
              const errorText = await response.text().catch(() => '无法读取错误信息');
              results.push({
                category: '实际上传测试',
                test: '文件上传（预签名URL）',
                status: 'fail',
                message: `预签名URL上传失败: ${response.status} ${response.statusText}`,
                details: {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorText.substring(0, 500),
                },
              });
              criticalIssues.push(`预签名URL上传失败: ${response.status}`);
              recommendations.push('检查IAM权限、存储桶策略和CORS配置');
            }
          } else {
            results.push({
              category: '实际上传测试',
              test: '文件上传（预签名URL）',
              status: 'warning',
              message: '无法测试预签名URL上传（环境不支持fetch）',
              details: {
                note: '直接上传测试已通过，预签名URL需要在前端测试',
              },
            });
          }
        } catch (error: any) {
          results.push({
            category: '实际上传测试',
            test: '文件上传（预签名URL）',
            status: 'fail',
            message: `预签名URL上传请求失败: ${error.message}`,
            details: {
              error: error.message,
            },
          });
          criticalIssues.push('预签名URL上传请求失败');
        }
      } catch (error: any) {
        results.push({
          category: '实际上传测试',
          test: '文件上传（直接）',
          status: 'fail',
          message: `直接上传失败: ${error.code || error.message}`,
          details: {
            errorCode: error.code,
            errorMessage: error.message,
          },
        });
        criticalIssues.push('直接上传失败，可能是IAM权限问题');
        recommendations.push('检查IAM用户是否有 s3:PutObject 权限');
      }
    } catch (error: any) {
      results.push({
        category: '实际上传测试',
        test: '实际上传测试',
        status: 'fail',
        message: `测试实际上传失败: ${error.message}`,
      });
    }
  }

  private async checkNetworkConnectivity(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const region = this.configService.get<string>('AWS_REGION');
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const s3Endpoint = `https://s3.${region}.amazonaws.com`;

      // 尝试连接S3端点（使用AWS SDK测试）
      try {
        // 使用headBucket来测试连接
        await this.s3.headBucket({ Bucket: bucket }).promise();

        results.push({
          category: '网络连接',
          test: 'S3端点连接',
          status: 'pass',
          message: `可以连接到S3端点: ${s3Endpoint}`,
          details: {
            endpoint: s3Endpoint,
            method: 'AWS SDK headBucket',
          },
        });
      } catch (error: any) {
        results.push({
          category: '网络连接',
          test: 'S3端点连接',
          status: 'warning',
          message: `无法连接到S3端点: ${error.code || error.message}`,
          details: {
            endpoint: s3Endpoint,
            errorCode: error.code,
            errorMessage: error.message,
          },
        });
        recommendations.push('检查网络连接和防火墙设置');
      }
    } catch (error: any) {
      results.push({
        category: '网络连接',
        test: '网络连接检查',
        status: 'warning',
        message: `检查网络连接失败: ${error.message}`,
      });
    }
  }

  private async checkSignatureVersion(
    results: DiagnosisResult[],
    criticalIssues: string[],
    recommendations: string[],
  ) {
    if (!this.s3) {
      return;
    }

    try {
      const bucket = this.configService.get<string>('AWS_S3_BUCKET');
      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: bucket,
        Key: 'test',
        Expires: 300,
      } as any);

      const url = new URL(presignedUrl);
      const algorithm = url.searchParams.get('X-Amz-Algorithm');

      if (algorithm === 'AWS4-HMAC-SHA256') {
        results.push({
          category: '签名版本',
          test: '签名算法版本',
          status: 'pass',
          message: '使用正确的签名算法 (AWS4-HMAC-SHA256)',
        });
      } else {
        results.push({
          category: '签名版本',
          test: '签名算法版本',
          status: 'fail',
          message: `签名算法不正确: ${algorithm}`,
          details: {
            current: algorithm,
            expected: 'AWS4-HMAC-SHA256',
          },
        });
        criticalIssues.push('签名算法版本不正确');
      }
    } catch (error: any) {
      results.push({
        category: '签名版本',
        test: '签名版本检查',
        status: 'fail',
        message: `检查签名版本失败: ${error.message}`,
      });
    }
  }
}

