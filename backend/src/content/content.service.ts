import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UploadService } from '../upload/upload.service';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * 从 OSS URL 中提取对象 key
   * 支持虚拟主机、路径风格以及自定义域名（与 OSS_PUBLIC_BASE_URL 一致）
   */
  private extractStorageKey(url: string): string | null {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      const urlObj = new URL(url);
      const rawPath = urlObj.pathname.replace(/^\/+/, '');
      if (!rawPath) {
        console.warn(`⚠️ URL 中没有有效路径: ${url}`);
        return null;
      }

      const { bucket, publicBaseUrl } = this.uploadService.getEndpointInfo();
      const hostname = urlObj.hostname.toLowerCase();

      const whitelistedHosts: string[] = [];
      if (publicBaseUrl) {
        try {
          whitelistedHosts.push(new URL(publicBaseUrl).hostname.toLowerCase());
        } catch {
          // 忽略非法的 publicBaseUrl 值
        }
      }

      const looksLikeStorageHost =
        hostname.includes('aliyuncs.com') ||
        hostname.includes('.oss-') ||
        whitelistedHosts.includes(hostname);

      if (!looksLikeStorageHost) {
        console.warn(`⚠️ URL 不属于 OSS 域名，跳过删除: ${url}`);
        return null;
      }

      let key = rawPath;

      if (bucket) {
        const hostContainsBucket = hostname.includes(bucket.toLowerCase());
        if (!hostContainsBucket && key.startsWith(`${bucket}/`)) {
          key = key.substring(bucket.length + 1);
        }
      }

      if (!key) {
        console.warn(`⚠️ 无法从URL提取key: ${url}`);
        return null;
      }

      try {
        const decodedKey = decodeURIComponent(key);
        console.log(`✅ 从URL提取key成功: ${url} -> ${decodedKey} (原始: ${key})`);
        return decodedKey;
      } catch (decodeError) {
        console.log(`✅ 从URL提取key成功（未解码）: ${url} -> ${key}`);
        return key;
      }
    } catch (error) {
      console.warn(`⚠️ 无法从URL提取对象 key: ${url}`, error);
      return null;
    }
  }

  /**
   * 删除内容关联的存储（OSS）图片文件
   */
  private async deleteStorageImages(images: any): Promise<void> {
    if (!images || !Array.isArray(images)) {
      console.warn('⚠️ deleteStorageImages: images为空或不是数组', images);
      return;
    }

    console.log(`🗑️ 开始删除存储图片，共 ${images.length} 张`);
    
    let successCount = 0;
    let failCount = 0;

    // 遍历所有图片URL，删除存储中的文件
    for (const imageUrl of images) {
      if (typeof imageUrl === 'string') {
        console.log(`🔍 处理图片URL: ${imageUrl}`);
        const key = this.extractStorageKey(imageUrl);
        if (key) {
          try {
            await this.uploadService.deleteFile(key);
            successCount++;
            console.log(`✅ 已删除存储文件: ${key}`);
          } catch (error: any) {
            failCount++;
            // 记录错误但不抛出，避免影响主流程
            console.error(`❌ 删除存储文件失败: ${key}`, {
              error: error.message,
              stack: error.stack,
            });
          }
        } else {
          failCount++;
          console.warn(`⚠️ 无法从URL提取key，跳过删除: ${imageUrl}`);
        }
      } else {
        console.warn(`⚠️ 图片URL不是字符串类型:`, imageUrl);
      }
    }
    
    console.log(`📊 存储图片删除完成: 成功 ${successCount} 张，失败 ${failCount} 张`);
  }

  async create(createContentDto: CreateContentDto) {
    return this.prisma.content.create({
      data: createContentDto,
    });
  }

  async findAll() {
    // 只返回未领取的内容
    const contents = await this.prisma.content.findMany({
      where: {
        isClaimed: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // 添加日志以调试
    console.log(`[ContentService] findAll: 返回 ${contents.length} 条未领取记录`);
    
    return contents;
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('内容不存在');
    }

    return content;
  }

  async remove(id: string) {
    const content = await this.findOne(id);
    
    // 先删除 OSS 中的图片文件
    if (content.images) {
      await this.deleteStorageImages(content.images);
    }
    
    // 然后删除数据库记录
    return this.prisma.content.delete({
      where: { id },
    });
  }

  async batchRemove(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new Error('请提供要删除的内容ID数组');
    }
    
    try {
      // 先查询要删除的内容，以便删除OSS文件
      const contentsToDelete = await this.prisma.content.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      // 删除所有关联的 OSS 图片文件
      for (const content of contentsToDelete) {
        if (content.images) {
          await this.deleteStorageImages(content.images);
        }
      }

      // 然后删除数据库记录
      const result = await this.prisma.content.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      return {
        deletedCount: result.count,
        message: `成功删除 ${result.count} 条内容`,
      };
    } catch (error) {
      throw new Error(`批量删除失败: ${error.message}`);
    }
  }

  async claimRandom() {
    // 使用事务确保原子性操作（查找并标记为已领取）
    return this.prisma.$transaction(async (tx) => {
      // 只查找未领取的内容
      const content = await tx.content.findFirst({
        where: {
          isClaimed: false,
        },
        orderBy: { createdAt: 'asc' }, // 按创建时间排序，最早创建的优先
      });

      if (!content) {
        throw new NotFoundException('没有可领取的内容');
      }

      // 标记为已领取，但不删除数据库记录和OSS图片
      // 用户查看完内容后，图片加载完成时会调用 confirmClaimed 真正删除
      const updatedContent = await tx.content.update({
        where: { id: content.id },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
        },
      });

      return updatedContent;
    });
  }

  /**
   * 确认已领取的内容（用户查看完后调用）
   * 真正删除数据库记录和OSS图片
   */
  async confirmClaimed(contentId: string) {
    // 参数验证：在调用 Prisma 之前检查
    if (!contentId || typeof contentId !== 'string' || contentId.trim() === '') {
      console.warn(`⚠️ confirmClaimed 收到无效的 contentId: ${contentId}`);
      throw new BadRequestException('contentId 参数不能为空或无效');
    }

    console.log(`🗑️ 开始确认删除内容: ${contentId}`);
    
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      console.warn(`⚠️ 内容不存在: ${contentId}`);
      throw new NotFoundException('内容不存在');
    }

    if (!content.isClaimed) {
      console.warn(`⚠️ 内容尚未被领取: ${contentId}`);
      throw new Error('该内容尚未被领取');
    }

    const imagesArray = Array.isArray(content.images) ? content.images : [];
    console.log(`📋 内容信息:`, {
      id: content.id,
      imagesCount: imagesArray.length,
      images: content.images,
    });

    // 先删除 OSS 中的图片文件
    if (imagesArray.length > 0) {
      console.log(`🗑️ 开始删除存储图片...`);
      await this.deleteStorageImages(imagesArray);
    } else {
      console.warn(`⚠️ 内容没有图片或图片数组为空: ${contentId}`);
    }

    // 然后删除数据库记录
    await this.prisma.content.delete({
      where: { id: contentId },
    });

    console.log(`✅ 内容已确认删除: ${contentId}`);
    return { message: '内容已确认删除' };
  }

  /**
   * 根据图片URL数组删除存储中的图片文件
   * 用于用户查看完内容后删除图片（保留用于兼容性）
   */
  async deleteImagesByUrls(imageUrls: string[]): Promise<void> {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return;
    }

    await this.deleteStorageImages(imageUrls);
  }

  async getCount() {
    // 只统计未领取的内容数量
    const count = await this.prisma.content.count({
      where: {
        isClaimed: false,
      },
    });
    return { count };
  }

  async getStats() {
    const total = await this.prisma.content.count();
    const unclaimed = await this.prisma.content.count({
      where: {
        isClaimed: false,
      },
    });
    const claimed = total - unclaimed;
    
    return {
      total,
      claimed,
      unclaimed,
    };
  }

  /**
   * 为前端提供图片下载代理，解决安卓端因跨域导致的下载失败问题
   */
  async getContentDownloadStream(imageUrl: string) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new BadRequestException('图片地址不能为空');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch (error) {
      console.warn(`⚠️ 无效的图片URL: ${imageUrl}`, error);
      throw new BadRequestException('图片地址无效');
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new BadRequestException('仅支持 http/https 协议的图片地址');
    }

    const requestModule = parsedUrl.protocol === 'https:' ? https : http;

    try {
      const stream = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const request = requestModule.get(imageUrl, (response) => {
          const statusCode = response.statusCode ?? 500;

          if (statusCode >= 400) {
            const statusMessage = response.statusMessage ?? 'Unknown error';
            response.resume(); // 消耗响应数据以释放内存
            reject(new Error(`下载失败: ${statusCode} ${statusMessage}`));
            return;
          }

          resolve(response);
        });

        request.on('error', (err) => {
          reject(err);
        });
      });

      const contentType = stream.headers['content-type'] || 'application/octet-stream';
      const contentLength = stream.headers['content-length'];
      const filename = decodeURIComponent(parsedUrl.pathname.split('/').pop() || 'content-image');

      return {
        stream,
        contentType,
        contentLength,
        filename,
      };
    } catch (error: any) {
      console.error(`❌ 获取图片流失败: ${imageUrl}`, {
        error: error.message,
      });
      throw new NotFoundException('图片下载失败，请稍后再试');
    }
  }
}
