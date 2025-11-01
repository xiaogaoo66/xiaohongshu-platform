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
      this.s3 = new AWS.S3({
        accessKeyId,
        secretAccessKey,
        region,
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
    };

    try {
      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', params);
      return {
        presignedUrl,
        key,
        url: `https://${bucket}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`,
      };
    } catch (error: any) {
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
}
