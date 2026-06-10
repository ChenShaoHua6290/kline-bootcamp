import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TrainingModule } from './training/training.module';
import { MarketDataModule } from './market-data/market-data.module';
import { ReplayModule } from './replay/replay.module';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env', '.env.production.local', '.env.production'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 2000,
      },
    ]),
    CommonModule,
    AuthModule,
    UsersModule,
    TrainingModule,
    MarketDataModule,
    ReplayModule,
    AccountModule,
    AdminModule,
    DashboardModule,
    CoursesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
