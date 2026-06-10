import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>`"'\\]/g, '').trim();
}

export class CreateInviteCodeDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsInt()
  @Min(1)
  maxUses!: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['TRIAL', 'PAID', 'INTERNAL'])
  type?: 'TRIAL' | 'PAID' | 'INTERNAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTrainingLimit?: number;

  @IsOptional()
  @IsIn(['NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  paidPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export class UpdateInviteCodeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTrainingLimit?: number;

  @IsOptional()
  @IsIn(['NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  paidPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export class QuickCreateInviteCodeQueryDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(256)
  secret!: string;

  @IsOptional()
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @IsOptional()
  @IsIn(['TRIAL', 'PAID', 'INTERNAL'])
  type?: 'TRIAL' | 'PAID' | 'INTERNAL';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(1000)
  dailyTrainingLimit?: number;

  @IsOptional()
  @IsIn(['NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  paidPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export class BanUserDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(240)
  reason!: string;
}

export class UpdateUserAccessDto {
  @IsOptional()
  @IsIn(['TRIAL', 'PAID', 'INTERNAL'])
  accessType?: 'TRIAL' | 'PAID' | 'INTERNAL';

  @IsOptional()
  @IsIn(['NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  plan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  @IsOptional()
  @IsIn(['TRAINING', 'FULL'])
  learningAccessLevel?: 'TRAINING' | 'FULL';

  @IsOptional()
  @IsDateString()
  accessExpiresAt?: string;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  extendMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTrainingLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  remark?: string;
}

export class AdminResetUserPasswordDto {
  @IsString()
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @MaxLength(128)
  confirmPassword!: string;
}
