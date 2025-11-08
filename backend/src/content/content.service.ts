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
    // 领取后会自动删除，所以所有记录都是未领取的
    // 明确不设置任何限制，返回所有记录
    const contents = await this.prisma.content.findMany({
      orderBy: { createdAt: 'desc' },
      // 不设置 take，返回所有记录
    });
    
    // 添加日志以调试
    console.log(`[ContentService] findAll: 返回 ${contents.length} 条记录`);
    
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
    // 使用事务确保原子性操作（查找并删除）
    return this.prisma.$transaction(async (tx) => {
      // 查找一条记录（领取后会自动删除，所以所有记录都是可领取的）
      const content = await tx.content.findFirst({
        orderBy: { createdAt: 'asc' }, // 按创建时间排序，最早创建的优先
      });

      if (!content) {
        throw new NotFoundException('没有可领取的内容');
      }

      // 先保存要返回的内容
      const contentToReturn = { ...content };
      
      // 先删除S3中的图片文件（在删除数据库记录之前）
      if (content.images) {
        await this.deleteS3Images(content.images);
      }
      
      // 然后删除数据库记录（领取后自动删除）
      await tx.content.delete({
        where: { id: content.id },
      });

      return contentToReturn;
    });
  }

  async getCount() {
    // 领取后会自动删除，所以直接统计总数即可
    const count = await this.prisma.content.count();
    return { count };
  }

  async getStats() {
    // 由于领取后会自动删除，所以总内容数 = 未领取数
    const total = await this.prisma.content.count();
    const unclaimed = total;
    
    // 已领取的内容会被删除，无法统计
    return {
      total,
      claimed: 0, // 已领取的内容已被删除，无法统计
      unclaimed,
    };
  }
}
