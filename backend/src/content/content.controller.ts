import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { BatchDeleteDto } from './dto/batch-delete.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('api')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // 管理员接口 - 需要JWT认证
  @UseGuards(JwtAuthGuard)
  @Post('admin/content')
  create(@Body() createContentDto: CreateContentDto) {
    return this.contentService.create(createContentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/content')
  async findAll() {
    const contents = await this.contentService.findAll();
    // 添加日志以调试
    console.log(`[ContentController] findAll: 准备返回 ${contents?.length || 0} 条记录`);
    return contents;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/content/:id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/content/:id')
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/content/batch-delete')
  batchRemove(@Body() batchDeleteDto: BatchDeleteDto) {
    return this.contentService.batchRemove(batchDeleteDto.ids);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  getStats() {
    return this.contentService.getStats();
  }

  // 用户接口 - 无需认证，但有防刷限制
  @UseGuards(ThrottlerGuard)
  @Get('content/claim')
  claimRandom() {
    return this.contentService.claimRandom();
  }

  @Get('content/count')
  getCount() {
    return this.contentService.getCount();
  }

  @Post('content/delete-images')
  deleteImages(@Body() body: { imageUrls: string[] }) {
    return this.contentService.deleteImagesByUrls(body.imageUrls || []);
  }

  @Post('content/confirm-claimed')
  confirmClaimed(@Body() body: { contentId: string }) {
    return this.contentService.confirmClaimed(body.contentId);
  }
}
