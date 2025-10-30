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
  findAll() {
    return this.contentService.findAll();
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
}
