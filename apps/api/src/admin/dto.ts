import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
}

export class BanUserDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(240)
  reason!: string;
}

