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
      Expires: 300, // 5分钟过期
      // 添加 ACL 设置（如果存储桶支持）
      // ACL: 'public-read', // 如果存储桶禁用了 ACL，注释掉这行
    };

    try {
      console.log('🔍 生成预签名 URL:', {
        bucket,
        key,
        contentType,
        region: this.configService.get<string>('AWS_REGION'),
      });

      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', params);
      
      console.log('✅ 预签名 URL 生成成功:', {
        key,
        urlLength: presignedUrl.length,
        // 不打印完整 URL（包含敏感信息）
      });

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
      try {
        // 尝试列出存储桶（需要 s3:ListBucket 权限）
        await this.s3.headBucket({ Bucket: bucket }).promise();
        config['bucketAccess'] = '✅ 可以访问存储桶';
      } catch (error: any) {
        config['bucketAccess'] = `❌ 无法访问存储桶: ${error.message} (${error.code})`;
      }

      // 尝试生成一个测试预签名 URL
      try {
        const testUrl = await this.s3.getSignedUrlPromise('putObject', {
          Bucket: bucket,
          Key: 'test/test.txt',
          ContentType: 'text/plain',
          Expires: 60,
        });
        config['presignedUrlTest'] = '✅ 可以生成预签名 URL';
        config['testUrlLength'] = testUrl.length;
      } catch (error: any) {
        config['presignedUrlTest'] = `❌ 无法生成预签名 URL: ${error.message} (${error.code})`;
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

    if (config.bucketAccess && config.bucketAccess.includes('❌')) {
      recommendations.push('⚠️ 无法访问存储桶，请检查：');
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

    if (recommendations.length === 0) {
      recommendations.push('✅ 配置看起来正常，如果仍然 403，请检查：');
      recommendations.push('  1. 前端上传时的 Content-Type 是否与生成预签名 URL 时一致');
      recommendations.push('  2. 存储桶的 CORS 配置是否正确');
      recommendations.push('  3. IAM 用户权限是否已生效（等待 1-2 分钟）');
    }

    return recommendations;
  }
}
