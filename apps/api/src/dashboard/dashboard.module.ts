import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrainingModule } from '../training/training.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthModule, TrainingModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
