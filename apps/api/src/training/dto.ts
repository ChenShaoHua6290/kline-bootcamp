import { Market } from '@prisma/client';
import { IsEnum, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class StartTrainingDto {
  @IsEnum(Market)
  market!: Market;

  @IsIn(['15m', '30m', '1H', '2H', '3H', '4H', '6H', '8H', '12H', 'D', '2D', 'W', 'M'])
  drivingTimeframe!: string;

  @IsIn([150, 300, 500])
  totalBars!: number;

  @IsIn([60, 150, 300, 500])
  initialVisibleBars!: number;
}

export class TrainingActionDto {
  @IsIn(['BUY_LONG', 'BUY_SHORT', 'CLOSE', 'HOLD'])
  action!: 'BUY_LONG' | 'BUY_SHORT' | 'CLOSE' | 'HOLD';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  positionPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  stopLossRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  takeProfitRatio?: number;
}
