import { Injectable, NotFoundException } from '@nestjs/common';
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
   * 例如: https://bucket.s3.region.amazonaws.com/uploads/file.jpg -> uploads/file.jpg
   */
  private extractS3Key(url: string): string | null {
    try {
      // 检查是否是S3 URL
      if (!url.includes('.s3.') || !url.includes('.amazonaws.com')) {
        return null;
      }

      const urlObj = new URL(url);
      // 移除开头的斜杠
      const key = urlObj.pathname.substring(1);
      return key || null;
    } catch (error) {
      console.warn(`无法从URL提取S3 key: ${url}`, error);
      return null;
    }
  }

  /**
   * 删除内容关联的S3图片文件
   */
  private async deleteS3Images(images: any): Promise<void> {
    if (!images || !Array.isArray(images)) {
      return;
    }

    // 遍历所有图片URL，删除S3中的文件
    for (const imageUrl of images) {
      if (typeof imageUrl === 'string') {
        const key = this.extractS3Key(imageUrl);
        if (key) {
          try {
            await this.uploadService.deleteFile(key);
            console.log(`✅ 已删除S3文件: ${key}`);
          } catch (error: any) {
            // 记录错误但不抛出，避免影响主流程
            console.warn(`⚠️ 删除S3文件失败: ${key}`, error.message);
          }
        }
      }
    }
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
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('内容不存在');
    }

    if (!content.isClaimed) {
      throw new Error('该内容尚未被领取');
    }

    // 先删除S3中的图片文件
    if (content.images) {
      await this.deleteS3Images(content.images);
    }

    // 然后删除数据库记录
    await this.prisma.content.delete({
      where: { id: contentId },
    });

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
