import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MARKET_VALUES, type Market } from '../common/domain-enums';
import { REAL_MARKET_TIMEFRAMES } from '../market-data/timeframes';

export class StartTrainingDto {
  @IsIn(MARKET_VALUES)
  market!: Market;

  @IsIn(REAL_MARKET_TIMEFRAMES as unknown as string[])
  drivingTimeframe!: string;

  @IsInt()
  @Min(50)
  @Max(5000)
  totalBars!: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(500)
  trainingBars?: number;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(500)
  initialVisibleBars?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  initialBalance?: number;
}

export class TrainingActionDto {
  @IsOptional()
  @IsIn(['BUY_LONG', 'BUY_SHORT', 'CLOSE', 'HOLD'])
  action?: 'BUY_LONG' | 'BUY_SHORT' | 'CLOSE' | 'HOLD';

  @IsOptional()
  @IsIn(['OPEN_LONG', 'OPEN_SHORT', 'ADD_LONG', 'ADD_SHORT', 'PARTIAL_CLOSE', 'FULL_CLOSE', 'HOLD'])
  actionType?: 'OPEN_LONG' | 'OPEN_SHORT' | 'ADD_LONG' | 'ADD_SHORT' | 'PARTIAL_CLOSE' | 'FULL_CLOSE' | 'HOLD';

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(100)
  positionPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  closePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  stopLossPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  takeProfitPrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  expectedPointer?: number;
}

export class SaveTrainingReviewDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  problemTags?: string[];
}

export class FinishTrainingDto {
  @IsIn(['completed', 'terminated', 'liquidated'])
  reason!: 'completed' | 'terminated' | 'liquidated';
}

export class HistoryQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 10))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(MARKET_VALUES)
  market?: Market;

  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'TERMINATED', 'LIQUIDATED', 'ENDED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'LIQUIDATED' | 'ENDED';

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isLiquidated?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  hasReview?: boolean;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
