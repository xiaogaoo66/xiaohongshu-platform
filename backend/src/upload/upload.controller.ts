import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presigned-url')
  async generatePresignedUrl(@Body() generatePresignedUrlDto: GeneratePresignedUrlDto) {
    return this.uploadService.generatePresignedUrl(
      generatePresignedUrlDto.filename,
      generatePresignedUrlDto.contentType,
    );
  }
}
