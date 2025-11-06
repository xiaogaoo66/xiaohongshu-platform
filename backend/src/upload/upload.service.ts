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
    
    try {
      await this.s3.deleteObject({
        Bucket: bucket,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }

  async testAWSConfig() {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    const config = {
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      region: region || '未配置',
      bucket: bucket || '未配置',
      accessKeyIdPrefix: accessKeyId ? accessKeyId.substring(0, 8) + '...' : '未配置',
      s3Initialized: !!this.s3,
    };

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
        config['bucketAccess'] = `⚠️ 无法访问存储桶: ${errorMsg} (${errorCode})`;
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
        config['presignedUrlTest'] = `❌ 无法生成预签名 URL: ${error.message} (${error.code})`;
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
}
