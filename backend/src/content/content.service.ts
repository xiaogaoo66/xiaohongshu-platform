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
    return this.prisma.content.findMany({
      where: { isClaimed: false },
      orderBy: { createdAt: 'desc' },
    });
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

  async claimRandom() {
    // 使用事务确保原子性操作
    return this.prisma.$transaction(async (tx) => {
      // 查找一条未领取的随机记录并锁定
      const content = await tx.content.findFirst({
        where: { isClaimed: false },
        orderBy: { createdAt: 'asc' }, // 可以改为随机排序
      });

      if (!content) {
        throw new NotFoundException('没有可领取的内容');
      }

      // 更新为已领取状态
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

  async getCount() {
    const count = await this.prisma.content.count({
      where: { isClaimed: false },
    });
    return { count };
  }

  async getStats() {
    const total = await this.prisma.content.count();
    const claimed = await this.prisma.content.count({
      where: { isClaimed: true },
    });
    const unclaimed = total - claimed;

    return {
      total,
      claimed,
      unclaimed,
    };
  }
}
