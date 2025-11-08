import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * 从S3 URL中提取key
   * 支持多种S3 URL格式：
   * - https://bucket.s3.region.amazonaws.com/uploads/file.jpg
   * - https://bucket.s3-region.amazonaws.com/uploads/file.jpg
   * - https://s3.region.amazonaws.com/bucket/uploads/file.jpg
   */
  private extractS3Key(url: string): string | null {
    try {
      // 检查是否是S3 URL
      if (!url || typeof url !== 'string') {
        return null;
      }

      // 检查是否是S3 URL格式
      if (!url.includes('amazonaws.com') && !url.includes('.s3.')) {
        console.warn(`⚠️ 不是S3 URL格式: ${url}`);
        return null;
      }

      const urlObj = new URL(url);
      // 移除开头的斜杠
      let key = urlObj.pathname.substring(1);
      
      // 如果是路径格式的URL (s3.region.amazonaws.com/bucket/key)，需要移除bucket部分
      if (url.includes('s3.') && !url.includes('.s3.')) {
        // 格式: https://s3.region.amazonaws.com/bucket/key
        const parts = key.split('/');
        if (parts.length > 1) {
          // 移除bucket部分，保留key
          key = parts.slice(1).join('/');
        }
      }
      
      if (!key) {
        console.warn(`⚠️ 无法从URL提取key: ${url}`);
        return null;
      }
      
      // 解码 URL 编码的字符（S3 中存储的实际文件名可能是未编码的）
      // 例如：%E9%87%91%E6%AF%9B%E5%B9%BC%E7%8A%AC -> 金毛幼犬
      try {
        const decodedKey = decodeURIComponent(key);
        console.log(`✅ 从URL提取key成功: ${url} -> ${decodedKey} (原始: ${key})`);
        return decodedKey;
      } catch (decodeError) {
        // 如果解码失败，使用原始 key
        console.log(`✅ 从URL提取key成功（未解码）: ${url} -> ${key}`);
        return key;
      }
    } catch (error) {
      console.warn(`⚠️ 无法从URL提取S3 key: ${url}`, error);
      return null;
    }
  }

  /**
   * 删除内容关联的S3图片文件
   */
  private async deleteS3Images(images: any): Promise<void> {
    if (!images || !Array.isArray(images)) {
      console.warn('⚠️ deleteS3Images: images为空或不是数组', images);
      return;
    }

    console.log(`🗑️ 开始删除S3图片，共 ${images.length} 张`);
    
    let successCount = 0;
    let failCount = 0;

    // 遍历所有图片URL，删除S3中的文件
    for (const imageUrl of images) {
      if (typeof imageUrl === 'string') {
        console.log(`🔍 处理图片URL: ${imageUrl}`);
        const key = this.extractS3Key(imageUrl);
        if (key) {
          try {
            await this.uploadService.deleteFile(key);
            successCount++;
            console.log(`✅ 已删除S3文件: ${key}`);
          } catch (error: any) {
            failCount++;
            // 记录错误但不抛出，避免影响主流程
            console.error(`❌ 删除S3文件失败: ${key}`, {
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
    
    console.log(`📊 S3图片删除完成: 成功 ${successCount} 张，失败 ${failCount} 张`);
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
    
    // 先删除S3中的图片文件
    if (content.images) {
      await this.deleteS3Images(content.images);
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
      // 先查询要删除的内容，以便删除S3文件
      const contentsToDelete = await this.prisma.content.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      // 删除所有关联的S3图片文件
      for (const content of contentsToDelete) {
        if (content.images) {
          await this.deleteS3Images(content.images);
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

      // 标记为已领取，但不删除数据库记录和S3图片
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
   * 真正删除数据库记录和S3图片
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

    // 先删除S3中的图片文件
    if (imagesArray.length > 0) {
      console.log(`🗑️ 开始删除S3图片...`);
      await this.deleteS3Images(imagesArray);
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
   * 根据图片URL数组删除S3中的图片文件
   * 用于用户查看完内容后删除图片（保留用于兼容性）
   */
  async deleteImagesByUrls(imageUrls: string[]): Promise<void> {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return;
    }

    await this.deleteS3Images(imageUrls);
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
}
