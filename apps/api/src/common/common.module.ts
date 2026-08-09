import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { SecurityLogService } from './security-log.service';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, SecurityLogService, EmailService],
  exports: [PrismaService, RedisService, SecurityLogService, EmailService],
})
export class CommonModule {}
