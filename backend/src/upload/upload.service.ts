import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    // 检查是否配置了 AWS 凭证
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    
    if (accessKeyId && secretAccessKey && region) {
      // 配置 AWS SDK，显式设置签名版本
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region,
        signatureVersion: 'v4',
      });
      
      this.s3 = new AWS.S3({
        accessKeyId,
        secretAccessKey,
        region,
        signatureVersion: 'v4',
        // 确保使用正确的端点格式
        s3ForcePathStyle: false,
      });
      
      console.log('✅ AWS S3 配置成功:', {
        region,
        accessKeyId: accessKeyId.substring(0, 8) + '...',
        bucket: this.configService.get<string>('AWS_S3_BUCKET'),
      });
    } else {
      console.warn('警告: AWS S3 环境变量未配置，图片上传功能将使用 Base64 编码（临时方案）');
    }
  }

  async generatePresignedUrl(filename: string, contentType: string) {
    // 如果没有配置 S3，返回 Base64 上传方式
    if (!this.s3) {
      return {
        presignedUrl: null,
        key: null,
        url: null,
        useBase64: true,
        message: '请配置 AWS S3 环境变量以使用文件上传功能，或使用 Base64 编码方式',
      };
    }

    const key = `uploads/${uuidv4()}-${filename}`;
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET 环境变量未配置');
    }

    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // 不设置 ACL，避免权限问题
      // 确保签名版本正确
    };

    try {
      console.log('🔍 生成预签名 URL:', {
        bucket,
        key,
        contentType,
        region: this.configService.get<string>('AWS_REGION'),
      });

      // 使用 getSignedUrlPromise 生成预签名URL
      // 确保使用 v4 签名版本
      // Expires 参数在 getSignedUrlPromise 中应该是秒数（number），但 TypeScript 类型定义期望 Date
      // 使用类型断言来绕过类型检查
      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
        ...params,
        Expires: 300, // 5分钟过期（秒数）
      } as any);
      
      // 解析URL以验证参数
      const urlObj = new URL(presignedUrl);
      const hasContentType = urlObj.searchParams.has('Content-Type') || urlObj.searchParams.has('x-amz-content-sha256');
      
      // 解析URL以提取参数
      const urlParams = urlObj.searchParams;
      const signedHeaders = urlParams.get('X-Amz-SignedHeaders') || '';
      
      console.log('✅ 预签名 URL 生成成功:', {
        key,
        urlLength: presignedUrl.length,
        hasContentTypeParam: hasContentType,
        region: this.configService.get<string>('AWS_REGION'),
        bucket,
        signedHeaders: signedHeaders.split(','),
        contentType: contentType,
        expiresIn: 300, // 5分钟
        // 不打印完整 URL（包含敏感信息）
      });
      
      // 验证关键参数
      if (!signedHeaders.includes('host')) {
        console.warn('⚠️ 警告: 预签名URL中未包含host签名头');
      }
      if (hasContentType && !urlParams.has('Content-Type')) {
        console.warn('⚠️ 警告: Content-Type参数可能未正确包含在预签名URL中');
      }

      return {
        presignedUrl,
        key,
        url: `https://${bucket}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`,
      };
    } catch (error: any) {
      console.error('❌ 生成预签名URL失败:', {
        error: error.message,
        code: error.code,
        bucket,
        region: this.configService.get<string>('AWS_REGION'),
      });
      throw new Error(`生成预签名URL失败: ${error.message}`);
    }
  }

  async deleteFile(key: string) {
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    
    if (!this.s3) {
      throw new Error('S3客户端未初始化，无法删除文件');
    }
    
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET 环境变量未配置');
    }
    
    console.log(`🗑️ 尝试删除S3文件:`, {
      bucket,
      key,
    });
    
    // 尝试删除（先使用提供的 key）
    try {
      const result = await this.s3.deleteObject({
        Bucket: bucket,
        Key: key,
      }).promise();
      
      // 验证文件是否真的被删除了（等待一小段时间后检查）
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
        
        // 检查文件是否还存在
        try {
          await this.s3.headObject({
            Bucket: bucket,
            Key: key,
          }).promise();
          
          // 如果文件还存在，说明删除可能失败了
          console.warn(`⚠️ 删除后文件仍存在，可能删除失败: ${key}`);
          
          // 尝试使用编码后的 key 删除
          const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
          if (encodedKey !== key) {
            console.log(`🔄 尝试使用编码后的 key 删除: ${encodedKey}`);
            try {
              await this.s3.deleteObject({
                Bucket: bucket,
                Key: encodedKey,
              }).promise();
              console.log(`✅ 使用编码后的 key 删除成功: ${encodedKey}`);
            } catch (encodedError: any) {
              console.warn(`⚠️ 使用编码后的 key 删除也失败: ${encodedKey}`, encodedError.message);
            }
          }
        } catch (headError: any) {
          // 文件不存在，说明删除成功
          if (headError.code === 'NotFound' || headError.code === '404') {
            console.log(`✅ S3文件删除成功并已验证: ${key}`);
          } else {
            console.warn(`⚠️ 验证删除状态时出错: ${headError.message}`);
          }
        }
      } catch (verifyError) {
        // 验证过程出错，但不影响删除操作
        console.warn(`⚠️ 验证删除状态失败:`, verifyError);
      }
      
      console.log(`✅ S3文件删除成功:`, {
        bucket,
        key,
        result,
      });
      
      return true;
    } catch (error: any) {
      // 如果删除失败，尝试使用编码后的 key
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        // 文件不存在，尝试使用编码后的 key
        const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
        if (encodedKey !== key) {
          console.log(`🔄 文件不存在，尝试使用编码后的 key: ${encodedKey}`);
          try {
            await this.s3.deleteObject({
              Bucket: bucket,
              Key: encodedKey,
            }).promise();
            console.log(`✅ 使用编码后的 key 删除成功: ${encodedKey}`);
            return true;
          } catch (encodedError: any) {
            if (encodedError.code === 'NotFound' || encodedError.code === 'NoSuchKey') {
              console.warn(`⚠️ 文件不存在（已尝试编码和未编码两种格式）: ${key}`);
              // 文件不存在不算错误，返回成功
              return true;
            }
            throw encodedError;
          }
        } else {
          // 文件不存在，不算错误
          console.warn(`⚠️ 文件不存在: ${key}`);
          return true;
        }
      }
      
      console.error(`❌ S3文件删除失败:`, {
        bucket,
        key,
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }

  async testAWSConfig() {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    // 检查 Access Key ID 格式
    const accessKeyIdLength = accessKeyId ? accessKeyId.length : 0;
    const accessKeyIdFormatValid = accessKeyId ? /^AKIA[0-9A-Z]{16}$/.test(accessKeyId) : false;
    
    const config = {
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      region: region || '未配置',
      bucket: bucket || '未配置',
      accessKeyIdPrefix: accessKeyId ? accessKeyId.substring(0, 8) + '...' : '未配置',
      accessKeyIdLength: accessKeyIdLength,
      accessKeyIdFormatValid: accessKeyIdFormatValid,
      accessKeyIdFull: accessKeyId || '未配置', // 显示完整 Access Key ID（用于诊断）
      s3Initialized: !!this.s3,
    };

    // 检查 Access Key ID 格式问题
    if (accessKeyId && !accessKeyIdFormatValid) {
      config['accessKeyIdWarning'] = `⚠️ Access Key ID 格式可能不正确（长度: ${accessKeyIdLength}，应为 20 个字符）`;
      config['accessKeyIdIssue'] = `当前值: ${accessKeyId}（${accessKeyIdLength} 字符）`;
      config['accessKeyIdExpected'] = '格式应为: AKIA + 16位大写字母和数字（总共 20 字符）';
    }
    
    // 尝试测试 S3 连接
    if (this.s3 && bucket) {
      let bucketAccessSuccess = false;
      let presignedUrlSuccess = false;
      
      // 尝试列出存储桶（需要 s3:ListBucket 权限）
      try {
        await this.s3.headBucket({ Bucket: bucket }).promise();
        config['bucketAccess'] = '✅ 可以访问存储桶';
        bucketAccessSuccess = true;
      } catch (error: any) {
        const errorMsg = error.message || error.code || '未知错误';
        const errorCode = error.code || 'Unknown';
        
        // 专门处理 InvalidAccessKeyId 错误
        if (errorCode === 'InvalidAccessKeyId' || errorMsg.includes('InvalidAccessKeyId')) {
          config['bucketAccess'] = `❌ AWS Access Key ID 无效或不存在: ${accessKeyId?.substring(0, 8)}... (${errorCode})`;
          config['criticalError'] = 'InvalidAccessKeyId';
          config['errorDetails'] = {
            code: errorCode,
            message: errorMsg,
            accessKeyIdPrefix: accessKeyId?.substring(0, 8) + '...',
            recommendation: '请在 Railway 环境变量中更新 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY',
          };
        } else {
          config['bucketAccess'] = `⚠️ 无法访问存储桶: ${errorMsg} (${errorCode})`;
        }
        bucketAccessSuccess = false;
      }

      // 尝试生成一个测试预签名 URL（这是关键功能）
      try {
        const testUrl = await this.s3.getSignedUrlPromise('putObject', {
          Bucket: bucket,
          Key: 'test/test.txt',
          ContentType: 'text/plain',
          Expires: 60,
        } as any);
        config['presignedUrlTest'] = '✅ 可以生成预签名 URL';
        config['testUrlLength'] = testUrl.length;
        presignedUrlSuccess = true;
      } catch (error: any) {
        const errorCode = error.code || 'Unknown';
        const errorMsg = error.message || '未知错误';
        
        // 专门处理 InvalidAccessKeyId 错误
        if (errorCode === 'InvalidAccessKeyId' || errorMsg.includes('InvalidAccessKeyId')) {
          config['presignedUrlTest'] = `❌ AWS Access Key ID 无效或不存在: ${accessKeyId?.substring(0, 8)}... (${errorCode})`;
          config['criticalError'] = 'InvalidAccessKeyId';
          config['errorDetails'] = {
            code: errorCode,
            message: errorMsg,
            accessKeyIdPrefix: accessKeyId?.substring(0, 8) + '...',
            recommendation: '请在 Railway 环境变量中更新 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY',
          };
        } else {
          config['presignedUrlTest'] = `❌ 无法生成预签名 URL: ${errorMsg} (${errorCode})`;
        }
        presignedUrlSuccess = false;
      }
      
      // 如果预签名 URL 成功但 headBucket 失败，说明功能正常，只是诊断信息有问题
      if (!bucketAccessSuccess && presignedUrlSuccess) {
        config['bucketAccess'] = '⚠️ 无法访问存储桶（但上传功能正常）';
        config['note'] = '虽然 headBucket 失败，但预签名 URL 生成成功，上传功能应该可以正常工作。';
      }
    }

    return {
      message: 'AWS S3 配置诊断',
      config,
      recommendations: this.getRecommendations(config),
    };
  }

  private getRecommendations(config: any): string[] {
    const recommendations: string[] = [];

    // 优先处理 Access Key ID 格式问题
    if (config.accessKeyIdWarning) {
      recommendations.push('⚠️ Access Key ID 格式问题');
      recommendations.push(`   ${config.accessKeyIdIssue}`);
      recommendations.push(`   ${config.accessKeyIdExpected}`);
      recommendations.push('');
      recommendations.push('🔧 可能的原因：');
      recommendations.push('  1. Access Key ID 在 Railway 环境变量中被截断');
      recommendations.push('  2. 复制时遗漏了最后一个字符');
      recommendations.push('  3. 环境变量中有多余的空格或换行符');
      recommendations.push('');
      recommendations.push('✅ 解决步骤：');
      recommendations.push('  1. 在 AWS IAM 控制台查看完整的 Access Key ID');
      recommendations.push('  2. 在 Railway 中删除旧的 AWS_ACCESS_KEY_ID 变量');
      recommendations.push('  3. 重新添加 AWS_ACCESS_KEY_ID，确保完整复制（20 个字符）');
      recommendations.push('  4. 保存后等待 Railway 重新部署');
      recommendations.push('');
    }

    // 优先处理 InvalidAccessKeyId 错误
    if (config.criticalError === 'InvalidAccessKeyId') {
      recommendations.push('🚨 严重错误：AWS Access Key ID 无效或不存在');
      recommendations.push(`   当前使用的 Access Key ID: ${config.errorDetails?.accessKeyIdPrefix || '未知'}`);
      recommendations.push('');
      recommendations.push('📋 解决步骤：');
      recommendations.push('  1. 登录 AWS IAM 控制台：https://console.aws.amazon.com/iam/');
      recommendations.push('  2. 选择你的 IAM 用户（xiaohongshu-s3-user）');
      recommendations.push('  3. 进入"安全凭证"（Security credentials）标签');
      recommendations.push('  4. 在"访问密钥"部分，创建新的访问密钥');
      recommendations.push('  5. 复制新的 Access Key ID 和 Secret Access Key');
      recommendations.push('');
      recommendations.push('🔧 在 Railway 中更新环境变量：');
      recommendations.push('  1. 登录 Railway：https://railway.app');
      recommendations.push('  2. 选择你的后端服务');
      recommendations.push('  3. 进入 "Variables"（变量）标签页');
      recommendations.push('  4. 更新以下环境变量：');
      recommendations.push('     - AWS_ACCESS_KEY_ID = 新的 Access Key ID');
      recommendations.push('     - AWS_SECRET_ACCESS_KEY = 新的 Secret Access Key');
      recommendations.push('  5. 保存后，Railway 会自动重新部署');
      recommendations.push('');
      recommendations.push('⚠️ 注意：旧的 Access Key 可能已被删除或过期，必须使用新的密钥');
      return recommendations;
    }

    if (!config.hasAccessKeyId || !config.hasSecretAccessKey) {
      recommendations.push('❌ 请配置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY');
    }

    if (config.region === '未配置') {
      recommendations.push('❌ 请配置 AWS_REGION');
    }

    if (config.bucket === '未配置') {
      recommendations.push('❌ 请配置 AWS_S3_BUCKET');
    }

    // 只有在预签名 URL 也失败时才显示严重错误
    const bucketAccessFailed = config.bucketAccess && (config.bucketAccess.includes('❌') || config.bucketAccess.includes('⚠️'));
    const presignedUrlFailed = config.presignedUrlTest && config.presignedUrlTest.includes('❌');
    
    if (bucketAccessFailed && !presignedUrlFailed) {
      // headBucket 失败但预签名 URL 成功，说明功能正常
      recommendations.push('💡 提示：虽然 headBucket 失败，但预签名 URL 生成成功，上传功能应该可以正常工作。');
      recommendations.push('   如果想修复 headBucket 错误，可以添加 s3:ListBucket 或 s3:HeadBucket 权限（可选）。');
    } else if (bucketAccessFailed && presignedUrlFailed) {
      // 两个都失败，说明有严重问题
      recommendations.push('❌ 无法访问存储桶，请检查：');
      recommendations.push('  1. IAM 用户是否有 s3:ListBucket 权限');
      recommendations.push('  2. 存储桶名称是否正确');
      recommendations.push('  3. 存储桶区域是否与 AWS_REGION 匹配');
    }

    if (config.presignedUrlTest && config.presignedUrlTest.includes('❌')) {
      recommendations.push('⚠️ 无法生成预签名 URL，请检查：');
      recommendations.push('  1. IAM 用户是否有 s3:PutObject 权限');
      recommendations.push('  2. 存储桶策略是否允许 PUT 操作');
      recommendations.push('  3. 访问密钥是否正确');
    }

    // 如果预签名URL成功但可能上传时403，添加详细诊断
    if (config.presignedUrlTest && config.presignedUrlTest.includes('✅')) {
      recommendations.push('💡 预签名 URL 生成成功，但如果上传时出现 403，请检查：');
      recommendations.push('  1. IAM 用户是否有 s3:PutObject 权限（必需）');
      recommendations.push('  2. 存储桶策略是否允许 PUT 操作');
      recommendations.push('  3. 前端上传时的 Content-Type 必须与生成预签名 URL 时的 contentType 完全一致');
      recommendations.push('  4. 前端上传时不要添加额外的请求头（只设置 Content-Type）');
      recommendations.push('  5. 检查浏览器控制台的详细错误信息');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 配置看起来正常，如果仍然 403，请检查：');
      recommendations.push('  1. 前端上传时的 Content-Type 是否与生成预签名 URL 时一致');
      recommendations.push('  2. 存储桶的 CORS 配置是否正确');
      recommendations.push('  3. IAM 用户权限是否已生效（等待 1-2 分钟）');
      recommendations.push('  4. 查看后端和前端控制台的详细日志');
    }

    return recommendations;
  }

  /**
   * 检查存储桶策略是否已生效
   * 验证策略是否包含 PutObject 权限
   */
  async checkBucketPolicyStatus() {
    if (!this.s3) {
      return {
        success: false,
        error: 'S3 客户端未初始化',
        message: '请先配置 AWS 环境变量',
      };
    }

    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    if (!bucket) {
      return {
        success: false,
        error: '存储桶名称未配置',
        message: '请配置 AWS_S3_BUCKET 环境变量',
      };
    }

    try {
      // 获取当前存储桶策略
      const policy = await this.s3.getBucketPolicy({ Bucket: bucket }).promise();
      const policyDoc = JSON.parse(policy.Policy || '{}');

      // 分析策略内容
      const statements = policyDoc.Statement || [];
      const allActions: string[] = [];
      const allPrincipals: string[] = [];
      const statementsDetails: any[] = [];

      statements.forEach((stmt: any, index: number) => {
        const stmtActions: string[] = [];
        const stmtPrincipals: string[] = [];

        if (stmt.Effect === 'Allow') {
          // 收集 Actions
          if (Array.isArray(stmt.Action)) {
            stmtActions.push(...stmt.Action);
            allActions.push(...stmt.Action);
          } else if (stmt.Action) {
            stmtActions.push(stmt.Action);
            allActions.push(stmt.Action);
          }

          // 收集 Principals
          if (stmt.Principal) {
            if (typeof stmt.Principal === 'string') {
              stmtPrincipals.push(stmt.Principal);
              allPrincipals.push(stmt.Principal);
            } else if (stmt.Principal['*']) {
              stmtPrincipals.push('*');
              allPrincipals.push('*');
            } else if (typeof stmt.Principal === 'object') {
              Object.keys(stmt.Principal).forEach((key) => {
                const principalValue = stmt.Principal[key];
                if (Array.isArray(principalValue)) {
                  stmtPrincipals.push(...principalValue);
                  allPrincipals.push(...principalValue);
                } else {
                  stmtPrincipals.push(principalValue);
                  allPrincipals.push(principalValue);
                }
              });
            }
          }
        }

        statementsDetails.push({
          index: index + 1,
          sid: stmt.Sid || `Statement-${index + 1}`,
          effect: stmt.Effect,
          actions: stmtActions,
          principals: stmtPrincipals,
          resources: Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource].filter(Boolean),
        });
      });

      // 检查关键权限
      const hasPutObject = allActions.some(
        (action) =>
          action === 's3:PutObject' ||
          action === 's3:PutObject*' ||
          action === 's3:*' ||
          (typeof action === 'string' && action.includes('PutObject')),
      );

      const hasGetObject = allActions.some(
        (action) =>
          action === 's3:GetObject' ||
          action === 's3:GetObject*' ||
          action === 's3:*' ||
          (typeof action === 'string' && action.includes('GetObject')),
      );

      const hasPutObjectAcl = allActions.some(
        (action) =>
          action === 's3:PutObjectAcl' ||
          action === 's3:PutObject*' ||
          action === 's3:*' ||
          (typeof action === 'string' && action.includes('PutObjectAcl')),
      );

      // 检查策略是否与用户提供的新策略匹配
      const expectedActions = ['s3:GetObject', 's3:PutObject', 's3:PutObjectAcl'];
      const hasAllExpectedActions = expectedActions.every((expectedAction) =>
        allActions.some(
          (action) =>
            action === expectedAction ||
            action === 's3:*' ||
            (typeof action === 'string' && action.includes(expectedAction.split(':')[1])),
        ),
      );

      // 检查是否有公共访问（Principal: "*"）
      const hasPublicAccess = allPrincipals.includes('*');

      // 验证策略是否生效 - 尝试实际上传测试
      let uploadTestResult: any = null;
      try {
        const testKey = `policy-check-test-${Date.now()}.txt`;
        const testContent = 'Policy check test file';
        const testContentType = 'text/plain';

        // 生成预签名URL
        const presignedUrl = await this.s3.getSignedUrlPromise('putObject', {
          Bucket: bucket,
          Key: testKey,
          ContentType: testContentType,
          Expires: 60,
        } as any);

        // 尝试实际上传
        try {
          await this.s3
            .putObject({
              Bucket: bucket,
              Key: testKey,
              Body: testContent,
              ContentType: testContentType,
            })
            .promise();

          uploadTestResult = {
            success: true,
            message: '✅ 实际上传测试成功 - 策略已生效！',
            method: '直接上传（AWS SDK）',
          };

          // 清理测试文件
          try {
            await this.s3.deleteObject({ Bucket: bucket, Key: testKey }).promise();
          } catch (e) {
            // 忽略清理错误
          }
        } catch (uploadError: any) {
          uploadTestResult = {
            success: false,
            message: `❌ 实际上传测试失败: ${uploadError.code || uploadError.message}`,
            error: uploadError.code,
            errorMessage: uploadError.message,
            method: '直接上传（AWS SDK）',
          };
        }
      } catch (urlError: any) {
        uploadTestResult = {
          success: false,
          message: `❌ 无法生成预签名URL: ${urlError.code || urlError.message}`,
          error: urlError.code,
          errorMessage: urlError.message,
        };
      }

      return {
        success: true,
        bucket,
        policyExists: true,
        policyVersion: policyDoc.Version,
        statementsCount: statements.length,
        statements: statementsDetails,
        permissions: {
          hasPutObject,
          hasGetObject,
          hasPutObjectAcl,
          hasAllExpectedActions,
          hasPublicAccess,
        },
        allActions: [...new Set(allActions)], // 去重
        allPrincipals: [...new Set(allPrincipals)], // 去重
        uploadTest: uploadTestResult,
        analysis: {
          policyStatus: hasPutObject
            ? '✅ 策略包含 PutObject 权限'
            : '❌ 策略缺少 PutObject 权限',
          isEffective: hasPutObject && uploadTestResult?.success,
          recommendations: this.getPolicyRecommendations(
            hasPutObject,
            hasGetObject,
            hasPutObjectAcl,
            hasPublicAccess,
            uploadTestResult,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'NoSuchBucketPolicy') {
        return {
          success: true,
          bucket,
          policyExists: false,
          message: '存储桶策略未配置（可能依赖IAM策略）',
          analysis: {
            policyStatus: '⚠️ 存储桶策略未配置',
            isEffective: null,
            recommendations: [
              '存储桶策略未配置，权限可能完全依赖IAM策略',
              '如果上传失败，建议添加存储桶策略以明确允许 PutObject 操作',
            ],
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        bucket,
        error: error.code || 'Unknown',
        errorMessage: error.message,
        message: `无法检查存储桶策略: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getPolicyRecommendations(
    hasPutObject: boolean,
    hasGetObject: boolean,
    hasPutObjectAcl: boolean,
    hasPublicAccess: boolean,
    uploadTest: any,
  ): string[] {
    const recommendations: string[] = [];

    if (!hasPutObject) {
      recommendations.push('❌ 存储桶策略缺少 s3:PutObject 权限');
      recommendations.push('   需要在策略中添加 s3:PutObject 操作');
    } else {
      recommendations.push('✅ 存储桶策略包含 s3:PutObject 权限');
    }

    if (!hasPutObjectAcl) {
      recommendations.push('⚠️ 存储桶策略缺少 s3:PutObjectAcl 权限（可选，但建议添加）');
    }

    if (hasPublicAccess) {
      recommendations.push('⚠️ 策略使用 Principal: "*"（公共访问）');
      recommendations.push('   虽然允许上传，但建议限制为特定IAM用户以提高安全性');
    }

    if (uploadTest && !uploadTest.success) {
      recommendations.push('❌ 实际上传测试失败');
      recommendations.push(`   错误: ${uploadTest.error || uploadTest.errorMessage}`);
      recommendations.push('   可能原因：');
      recommendations.push('     1. 策略已更新但尚未生效（等待1-2分钟）');
      recommendations.push('     2. IAM用户权限不足');
      recommendations.push('     3. 存储桶阻止公共访问设置阻止了操作');
    } else if (uploadTest && uploadTest.success) {
      recommendations.push('✅ 实际上传测试成功 - 策略已生效！');
    }

    if (hasPutObject && uploadTest && uploadTest.success) {
      recommendations.push('✅ 策略配置正确且已生效，上传功能应该可以正常工作');
    }

    return recommendations;
  }
}
