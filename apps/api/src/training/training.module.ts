import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({ imports: [MarketDataModule], controllers: [TrainingController], providers: [TrainingService], exports: [TrainingService] })
export class TrainingModule {}
