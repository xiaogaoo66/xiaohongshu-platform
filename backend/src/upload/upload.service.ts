import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  async generatePresignedUrl(filename: string, contentType: string) {
    const key = `uploads/${uuidv4()}-${filename}`;
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

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
    } catch (error) {
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
