import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const MARKETS = ['crypto', 'stock', 'futures', 'gold'] as const;
const SOURCES = ['binance', 'csv', 'histdata', 'yahoo_csv', 'generic_csv'] as const;

export class CreateDataImportJobDto {
  @IsString()
  @IsIn(MARKETS)
  market!: (typeof MARKETS)[number];

  @IsString()
  @IsIn(SOURCES)
  source!: (typeof SOURCES)[number];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols!: string[];

  @IsString()
  interval!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  startMonth?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  endMonth?: string;

  @IsOptional()
  @IsBoolean()
  autoAggregate?: boolean;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class ListDataImportJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
