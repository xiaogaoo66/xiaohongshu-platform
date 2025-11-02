import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.content.delete({
      where: { id },
    });
  }

  async batchRemove(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new Error('请提供要删除的内容ID数组');
    }
    
    try {
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
      
      // 立即删除记录（领取后自动删除）
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
