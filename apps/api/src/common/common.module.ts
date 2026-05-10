import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { SecurityLogService } from './security-log.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, SecurityLogService],
  exports: [PrismaService, RedisService, SecurityLogService],
})
export class CommonModule {}
