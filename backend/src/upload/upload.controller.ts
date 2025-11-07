import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadDeepDiagnosisService } from './upload-deep-diagnosis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { ConfigService } from '@nestjs/config';

@Controller('api/upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly deepDiagnosisService: UploadDeepDiagnosisService,
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

  @Get('diagnose')
  async diagnose() {
    console.log('🔍 开始诊断上传配置...');
    return this.uploadService.testAWSConfig();
  }

  @Get('deep-diagnosis')
  async deepDiagnosis() {
    console.log('🔬 开始深度诊断...');
    return this.deepDiagnosisService.performDeepDiagnosis();
  }

  @Get('check-policy')
  async checkPolicy() {
    console.log('🔍 检查存储桶策略是否生效...');
    return this.deepDiagnosisService.checkPolicyEffectiveness();
  }
}


