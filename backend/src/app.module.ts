import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ContentModule } from './content/content.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 10000, // 10秒
        limit: 1, // 限制每个IP 10秒内只能请求1次
      },
    ]),
    PrismaModule,
    AuthModule,
    AdminModule,
    ContentModule,
    UploadModule,
  ],
})
export class AppModule {}


