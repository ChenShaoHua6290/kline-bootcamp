import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TrainingModule } from './training/training.module';
import { MarketDataModule } from './market-data/market-data.module';
import { ReplayModule } from './replay/replay.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    TrainingModule,
    MarketDataModule,
    ReplayModule,
    AccountModule,
  ],
  providers: [PrismaService, RedisService],
})
export class AppModule {}
