import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { ConfigService } from '@nestjs/config';

@Controller('api/upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('presigned-url')
  async generatePresignedUrl(@Body() generatePresignedUrlDto: GeneratePresignedUrlDto) {
    return this.uploadService.generatePresignedUrl(
      generatePresignedUrlDto.filename,
      generatePresignedUrlDto.contentType,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-config')
  async testConfig() {
    return this.uploadService.testAWSConfig();
  }
}


