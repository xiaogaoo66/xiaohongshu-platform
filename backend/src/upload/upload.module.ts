import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UploadDeepDiagnosisService } from './upload-deep-diagnosis.service';

@Module({
  providers: [UploadService, UploadDeepDiagnosisService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}


