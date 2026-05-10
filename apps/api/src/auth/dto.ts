import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>`"'\\]/g, '').trim();
}

export class AuthDto {
  @Transform(({ value }) => String(sanitizeText(String(value ?? ''))).toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MinLength(6)
  password!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class RefreshTokenDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  refreshToken!: string;
}
