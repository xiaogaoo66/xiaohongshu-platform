import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly bucket: string | undefined;
  private readonly region: string | undefined;
  private readonly endpoint: string | undefined;
  private readonly publicBaseUrl: string | undefined;
  private ossClient: OSS | null = null;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('OSS_BUCKET');
    this.region = this.configService.get<string>('OSS_REGION');
    this.endpoint = this.configService.get<string>('OSS_ENDPOINT');
    this.publicBaseUrl = this.normalizePublicBaseUrl(
      this.configService.get<string>('OSS_PUBLIC_BASE_URL'),
    );

    this.initializeClient();
  }

  async generatePresignedUrl(filename: string, contentType: string) {
    if (!this.ossClient || !this.bucket) {
      return {
        presignedUrl: null,
        key: null,
        url: null,
        useBase64: true,
        message: '请先配置阿里云 OSS 的 AccessKey、Region、Bucket，再使用上传功能；暂时可以走 Base64 上传。',
      };
    }

    const key = `uploads/${uuidv4()}-${filename}`;

    try {
      // 规范化 Content-Type：移除 charset 参数，确保签名一致性
      // 因为浏览器通常不包含 charset，而某些客户端可能包含
      let normalizedContentType =
        contentType && contentType !== 'undefined' ? contentType : undefined;

      if (normalizedContentType) {
        // 移除 charset 参数，只保留主类型和子类型
        // 例如: "text/plain; charset=utf-8" -> "text/plain"
        normalizedContentType = normalizedContentType.split(';')[0].trim();
      }

      // 使用 POST 表单上传方式，避免 CORS 预检请求问题
      // POST 表单上传使用 multipart/form-data，通常不会触发 OPTIONS 预检请求
      const finalContentType = normalizedContentType || 'application/octet-stream';

      try {
        // 生成 POST 表单上传的签名
        const policy = this.ossClient.calculatePostSignature({
          expiration: new Date(Date.now() + 300 * 1000).toISOString(),
          conditions: [
            ['content-length-range', 0, 10 * 1024 * 1024], // 最大 10MB
            ['eq', '$key', key],
            ['eq', '$Content-Type', finalContentType],
          ],
        });

        // 验证 policy 返回值
        if (!policy) {
          throw new Error('calculatePostSignature 返回 null 或 undefined');
        }

        if (!policy.policy) {
          throw new Error('calculatePostSignature 返回的 policy.policy 为 undefined');
        }

        if (!policy.signature) {
          console.error('❌ calculatePostSignature 返回的 signature 为 undefined', {
            policyKeys: Object.keys(policy),
            policyType: typeof policy,
            policyValue: JSON.stringify(policy).substring(0, 200),
          });
          throw new Error('calculatePostSignature 返回的 policy.signature 为 undefined，请检查 OSS AccessKey Secret 配置');
        }

        if (!this.ossClient.options.accessKeyId) {
          throw new Error('OSS 客户端 accessKeyId 未配置');
        }

        const formData = {
          key,
          policy: policy.policy,
          OSSAccessKeyId: this.ossClient.options.accessKeyId,
          signature: policy.signature,
          'Content-Type': finalContentType,
        };

        // 验证 formData 完整性
        if (!formData.signature || formData.signature === 'undefined') {
          throw new Error(`签名验证失败：signature 为 ${formData.signature}`);
        }

        // 构建上传地址
        const uploadEndpoint = this.endpoint && this.endpoint.trim()
          ? this.endpoint.replace(/^https?:\/\//, '')
          : `${this.bucket}.${this.region}.aliyuncs.com`;
        const action = `https://${uploadEndpoint}`;

        console.log('✅ 生成 OSS POST 表单签名成功', {
          bucket: this.bucket,
          key,
          contentType: finalContentType,
          region: this.region,
          signatureLength: formData.signature?.length || 0,
          hasSignature: !!formData.signature,
          hasPolicy: !!formData.policy,
          hasAccessKeyId: !!formData.OSSAccessKeyId,
        });

        return {
          formData,
          action,
          key,
          url: this.buildPublicUrl(key),
          expectedContentType: finalContentType,
          usePostForm: true, // 标记使用 POST 表单上传
        };
      } catch (error: any) {
        console.error('❌ 生成 POST 表单签名失败，回退到 PUT 方法', error);
        
        // 如果 POST 表单签名失败，回退到原来的 PUT 方法
        const signatureOptions: OSS.SignatureUrlOptions = {
          method: 'PUT',
          expires: 300,
        };

        if (normalizedContentType) {
          signatureOptions.headers = {
            'Content-Type': normalizedContentType,
          };
        }

        const presignedUrl = this.ossClient.signatureUrl(key, {
          ...signatureOptions,
        });

        console.log('✅ 生成 OSS 预签名 URL 成功（PUT 方法）', {
          bucket: this.bucket,
          key,
          contentType: normalizedContentType || '未指定',
          region: this.region,
        });

        return {
          presignedUrl,
          key,
          url: this.buildPublicUrl(key),
          expectedContentType: normalizedContentType || finalContentType,
          usePostForm: false,
        };
      }
    } catch (error: any) {
      console.error('❌ 生成 OSS 预签名 URL 失败', {
        message: error?.message || error,
        bucket: this.bucket,
        region: this.region,
      });
      throw new Error(`生成预签名 URL 失败：${error?.message || error}`);
    }
  }

  async deleteFile(key: string) {
    if (!this.ossClient || !this.bucket) {
      throw new Error('OSS 客户端未初始化，无法删除文件');
    }

    try {
      await this.ossClient.delete(key);
      console.log('✅ 已删除 OSS 文件', { key });
      return true;
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        console.warn('⚠️ 目标文件不存在，视为已删除', { key });
        return true;
      }

      console.error('❌ 删除 OSS 文件失败', {
        key,
        message: error?.message || error,
      });
      throw new Error(`删除文件失败：${error?.message || error}`);
    }
  }

  async testOssConfig() {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET');

    const config = {
      hasAccessKeyId: !!accessKeyId,
      hasAccessKeySecret: !!accessKeySecret,
      region: this.region || '未配置',
      bucket: this.bucket || '未配置',
      endpoint: this.endpoint || '默认（根据 region 自动推导）',
      accessKeyIdPreview: accessKeyId ? `${accessKeyId.substring(0, 6)}***` : '未配置',
      ossInitialized: !!this.ossClient,
    };

    if (this.ossClient && this.bucket) {
      try {
        await this.ossClient.getBucketInfo(this.bucket);
        config['bucketAccess'] = '✅ 可以访问 Bucket';
      } catch (error: any) {
        config['bucketAccess'] = `⚠️ 无法访问 Bucket：${error?.message || error}`;
      }

      try {
        const url = this.ossClient.signatureUrl('diagnose/test.txt', {
          method: 'POST',
          expires: 60,
          headers: { 'Content-Type': 'text/plain' },
        });
        config['presignedUrlTest'] = `✅ 预签名 URL 生成成功（长度 ${url.length}）`;
      } catch (error: any) {
        config['presignedUrlTest'] = `❌ 无法生成预签名 URL：${error?.message || error}`;
      }
    }

    return {
      message: '阿里云 OSS 配置诊断',
      config,
      recommendations: this.getRecommendations(config),
    };
  }

  private initializeClient() {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET');

    if (!accessKeyId || !accessKeySecret || !this.region || !this.bucket) {
      console.warn('⚠️ OSS 配置不完整：请检查 AccessKey、Region、Bucket');
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

    this.ossClient = new (OSS.default || OSS)(options);

    console.log('✅ 已初始化阿里云 OSS 客户端', {
      region: this.region,
      bucket: this.bucket,
      endpoint: this.endpoint && this.endpoint.trim() ? this.endpoint : '自动推导（根据 region）',
    });
  }

  private getRecommendations(config: Record<string, any>): string[] {
    const recommendations: string[] = [];

    if (!config.hasAccessKeyId || !config.hasAccessKeySecret) {
      recommendations.push('❌ 请在 .env 中配置 OSS 的 AccessKeyId / AccessKeySecret。');
    }

    if (config.region === '未配置') {
      recommendations.push('❌ 请设置 OSS_REGION（例如 oss-cn-chengdu）。');
    }

    if (config.bucket === '未配置') {
      recommendations.push('❌ 请设置 OSS_BUCKET（即 OSS Bucket 名称）。');
    }

    if (config.bucketAccess?.startsWith('⚠️')) {
      recommendations.push('⚠️ 无法访问 Bucket：确认 AccessKey 是否具备读写权限，并检查 Region/Bucket 名是否正确。');
    }

    if (config.presignedUrlTest?.startsWith('❌')) {
      recommendations.push('⚠️ 预签名 URL 生成失败：请确认 AccessKey 拥有 PutObject 权限，且 endpoint/region 配置正确。');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 配置看起来正常，如仍有 403/超时，请检查 CORS、网络或前端上传时的 Content-Type。');
    }

    return recommendations;
  }

  private buildPublicUrl(key: string) {
    if (!this.bucket) {
      return key;
    }

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key}`;
    }

    // 只有当 endpoint 有值且不为空字符串时才使用
    if (this.endpoint && this.endpoint.trim()) {
      const cleaned = this.endpoint.replace(/^https?:\/\//, '');
      return `https://${this.bucket}.${cleaned}/${key}`;
    }

    return `https://${this.bucket}.${this.region}.aliyuncs.com/${key}`;
  }

  getEndpointInfo() {
    return {
      bucket: this.bucket,
      region: this.region,
      endpoint: this.endpoint,
      publicBaseUrl: this.publicBaseUrl,
    };
  }


  private normalizePublicBaseUrl(url?: string | null) {
    if (!url) {
      return undefined;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.replace(/\/+$/, '');
  }
}

