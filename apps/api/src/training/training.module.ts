import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({ imports: [AuthModule, MarketDataModule], controllers: [TrainingController], providers: [TrainingService], exports: [TrainingService] })
export class TrainingModule {}
