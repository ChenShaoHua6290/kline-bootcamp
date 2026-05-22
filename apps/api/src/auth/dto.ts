import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from './password-policy';

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>`"'\\]/g, '').trim();
}

const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class LoginDto {
  @Transform(({ value }) => String(sanitizeText(String(value ?? ''))).toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RegisterDto {
  @Transform(({ value }) => String(sanitizeText(String(value ?? ''))).toLowerCase())
  @IsEmail()
  email!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: '密码必须包含字母和数字' })
  password!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[\u4e00-\u9fa5A-Za-z0-9_]+$/)
  nickname?: string;
}

export class RefreshTokenDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => String(sanitizeText(String(value ?? ''))).toLowerCase())
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  token!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: '密码必须包含字母和数字' })
  newPassword!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  currentPassword!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: '密码必须包含字母和数字' })
  newPassword!: string;

  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  confirmPassword!: string;
}
