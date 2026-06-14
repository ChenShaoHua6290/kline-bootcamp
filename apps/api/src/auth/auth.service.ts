import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { EmailService } from '../common/email.service';
import { PrismaService } from '../common/prisma.service';
import { SecurityLogService } from '../common/security-log.service';
import { DEFAULT_TRIAL_DAILY_TRAINING_LIMIT, DEFAULT_TRIAL_DAYS } from '../common/trial-access';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResetPasswordDto } from './dto';
import { isPasswordStrong, passwordStrengthMessage } from './password-policy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly securityLogService: SecurityLogService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const prisma = this.prisma as any;
    const existing = await this.usersService.findAnyByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already exists');
    if (!isPasswordStrong(dto.password)) throw new BadRequestException(passwordStrengthMessage());

    const nickname = (dto.nickname ?? '').trim();
    if (!nickname) throw new BadRequestException('昵称不能为空');
    if (nickname.length < 2 || nickname.length > 20) throw new BadRequestException('昵称长度需在2-20之间');
    if (!/^[\u4e00-\u9fa5A-Za-z0-9_]+$/.test(nickname)) throw new BadRequestException('昵称仅支持中文、英文、数字和下划线');

    const code = dto.inviteCode?.trim();
    const inviteSelect = {
      id: true,
      isActive: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      type: true,
      trialDays: true,
      dailyTrainingLimit: true,
      paidPlan: true,
      durationMonths: true,
    };
    const invite = code
      ? await prisma.inviteCode.findFirst({
          where: { code, deletedAt: null },
          select: inviteSelect,
        })
      : null;
    if (code) {
      if (!invite) throw new BadRequestException('邀请码错误');
      if (!invite.isActive) throw new BadRequestException('邀请码已失效');
      if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) throw new BadRequestException('邀请码已过期');
      if (invite.usedCount >= invite.maxUses) throw new BadRequestException('邀请码使用次数已达上限');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await prisma.$transaction(async (tx: any) => {
      const latestInvite = invite
        ? await tx.inviteCode.findUnique({
            where: { id: invite.id },
            select: inviteSelect,
          })
        : null;
      if (invite) {
        if (!latestInvite || !latestInvite.isActive) throw new BadRequestException('邀请码已失效');
        if (latestInvite.expiresAt && latestInvite.expiresAt.getTime() <= Date.now()) throw new BadRequestException('邀请码已过期');
        if (latestInvite.usedCount >= latestInvite.maxUses) throw new BadRequestException('邀请码使用次数已达上限');
      }

      const now = new Date();
      let accessType: 'TRIAL' | 'PAID' | 'INTERNAL' = latestInvite ? (latestInvite.type as 'TRIAL' | 'PAID' | 'INTERNAL') : 'TRIAL';
      let accessStartAt: Date | null = now;
      let accessExpiresAt: Date | null = null;
      let dailyTrainingLimit: number | null = null;
      let isTrainingUnlimited = true;
      let currentPlan: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'NONE';

      if (accessType === 'TRIAL') {
        const trialDays = latestInvite?.trialDays ?? DEFAULT_TRIAL_DAYS;
        accessExpiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
        dailyTrainingLimit = latestInvite?.dailyTrainingLimit ?? DEFAULT_TRIAL_DAILY_TRAINING_LIMIT;
        isTrainingUnlimited = false;
      } else if (accessType === 'PAID' && latestInvite) {
        const plan = (latestInvite.paidPlan as 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY') ?? 'MONTHLY';
        const months = latestInvite.durationMonths ?? (plan === 'QUARTERLY' ? 3 : plan === 'YEARLY' ? 12 : 1);
        const d = new Date(now);
        d.setMonth(d.getMonth() + months);
        accessExpiresAt = d;
        currentPlan = plan === 'NONE' ? 'MONTHLY' : plan;
      }

      const created = await tx.user.create({
        data: {
          email: dto.email,
          password: hashed,
          nickname,
          accessType,
          accessStartAt,
          accessExpiresAt,
          dailyTrainingLimit,
          isTrainingUnlimited,
          accessStatus: 'ACTIVE',
          currentPlan,
          accessInviteCodeId: latestInvite?.id ?? null,
        },
      });
      if (latestInvite) {
        await tx.inviteCode.update({ where: { id: latestInvite.id }, data: { usedCount: { increment: 1 } } });
        await tx.inviteCodeRedemption.create({ data: { inviteCodeId: latestInvite.id, userId: created.id } });
      }
      return created;
    });

    const rows = await this.prisma.$queryRaw<Array<{ role: string | null }>>`
      SELECT role FROM "User" WHERE id = ${user.id} AND "deletedAt" IS NULL LIMIT 1
    `;
    return this.issueTokens(user.id, user.email, rows[0]?.role ?? 'USER', user.nickname ?? null);
  }

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.securityLogService.logLoginFailed({ ip: meta?.ip, userAgent: meta?.userAgent, detail: `email=${dto.email}` });
      throw new UnauthorizedException('Invalid credentials');
    }

    const userRows = await this.prisma.$queryRaw<Array<{ id: string; role: string | null; isBanned: boolean | null }>>`
      SELECT id, role, "isBanned"
      FROM "User"
      WHERE id = ${user.id}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const userExtra = userRows[0];
    if (userExtra?.isBanned) throw new ForbiddenException('账号已被封禁，请联系管理员');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.securityLogService.logLoginFailed({ userId: user.id, ip: meta?.ip, userAgent: meta?.userAgent, detail: 'password mismatch' });
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, userExtra?.role ?? 'USER', user.nickname ?? null);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { message: '如果该邮箱已注册，我们已发送重置密码邮件' };
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return generic;

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentRows = await this.prisma.$queryRaw<Array<{ c: number | string }>>`
      SELECT COUNT(1) as c
      FROM "password_reset_tokens"
      WHERE "userId" = ${user.id}
        AND "createdAt" > ${oneMinuteAgo}
    `;
    const recentCount = Number(recentRows[0]?.c ?? 0);
    if (recentCount > 0) return generic;

    await this.prisma.$executeRaw`
      DELETE FROM "password_reset_tokens"
      WHERE "userId" = ${user.id}
    `;
    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.$executeRaw`
      INSERT INTO "password_reset_tokens" (id, "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES (${`prt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${user.id}, ${tokenHash}, ${expiresAt}, ${new Date()})
    `;

    const baseUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(plainToken)}`;
    await this.emailService.sendPasswordResetEmail({ to: user.email, resetLink });
    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('两次密码不一致');
    if (!isPasswordStrong(dto.newPassword)) throw new BadRequestException(passwordStrengthMessage());

    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const now = new Date();
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; userPassword: string }>
    >`
      SELECT prt.id, prt."userId", u.password as "userPassword"
      FROM "password_reset_tokens" prt
      JOIN "User" u ON u.id = prt."userId"
      WHERE prt."tokenHash" = ${tokenHash}
        AND prt."usedAt" IS NULL
        AND prt."expiresAt" > ${now}
        AND u."deletedAt" IS NULL
      LIMIT 1
    `;
    const record = rows[0];
    if (!record) throw new BadRequestException('链接已过期或无效');

    const sameAsOld = await bcrypt.compare(dto.newPassword, record.userPassword);
    if (sameAsOld) throw new BadRequestException('新密码不能与旧密码相同');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User"
        SET password = ${passwordHash}
        WHERE id = ${record.userId}
      `;
      await tx.$executeRaw`
        UPDATE "password_reset_tokens"
        SET "usedAt" = ${now}
        WHERE id = ${record.id}
      `;
      await tx.$executeRaw`
        UPDATE "RefreshToken"
        SET "revokedAt" = ${now}
        WHERE "userId" = ${record.userId}
          AND "revokedAt" IS NULL
      `;
    });

    return { message: '密码已重置，请重新登录' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('两次密码不一致');
    if (!isPasswordStrong(dto.newPassword)) throw new BadRequestException(passwordStrengthMessage());

    const user = await this.usersService.findPublicById(userId);
    if (!user) throw new UnauthorizedException('Invalid token');
    const userWithPassword = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userWithPassword) throw new UnauthorizedException('Invalid token');

    const currentValid = await bcrypt.compare(dto.currentPassword, userWithPassword.password);
    if (!currentValid) throw new BadRequestException('当前密码错误');

    const sameAsOld = await bcrypt.compare(dto.newPassword, userWithPassword.password);
    if (sameAsOld) throw new BadRequestException('新密码不能与旧密码相同');

    const now = new Date();
    const nextHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { password: nextHash } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    });

    return { message: '密码修改成功，请重新登录' };
  }

  async refresh(dto: RefreshTokenDto) {
    const now = new Date();
    const payload = this.jwtService.verify(dto.refreshToken, { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret' });
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        revokedAt: Date | null;
        email: string;
        nickname: string | null;
        role: string | null;
        isBanned: boolean | null;
      }>
    >`
      SELECT rt.id, rt."userId", rt."tokenHash", rt."expiresAt", rt."revokedAt",
             u.email, u.nickname, u.role, u."isBanned"
      FROM "RefreshToken" rt
      JOIN "User" u ON u.id = rt."userId"
      WHERE rt.id = ${payload.jti as string}
        AND rt."userId" = ${payload.sub as string}
        AND rt."revokedAt" IS NULL
        AND rt."expiresAt" > ${now}
        AND u."deletedAt" IS NULL
      LIMIT 1
    `;
    const record = rows[0];
    if (!record) throw new UnauthorizedException('Refresh token 已失效');
    if (record.isBanned) throw new ForbiddenException('账号已被封禁，请联系管理员');
    const matched = await bcrypt.compare(dto.refreshToken, record.tokenHash);
    if (!matched) throw new UnauthorizedException('Refresh token 非法');

    await this.prisma.$executeRaw`UPDATE "RefreshToken" SET "revokedAt" = ${now} WHERE id = ${record.id}`;
    return this.issueTokens(record.userId, record.email, record.role ?? 'USER', record.nickname ?? null);
  }

  async logout(dto: RefreshTokenDto) {
    const now = new Date();
    try {
      const payload = this.jwtService.verify(dto.refreshToken, { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret' });
      await this.prisma.$executeRaw`
        UPDATE "RefreshToken"
        SET "revokedAt" = ${now}
        WHERE id = ${payload.jti as string}
          AND "userId" = ${payload.sub as string}
          AND "revokedAt" IS NULL
      `;
    } catch {
      return { ok: true };
    }
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.usersService.findPublicById(userId);
    if (!user) throw new UnauthorizedException('Invalid token');
    return user;
  }

  private async issueTokens(sub: string, email: string, role: string, nickname: string | null) {
    const now = new Date();
    const accessToken = this.jwtService.sign(
      { sub, email, role },
      { secret: process.env.JWT_SECRET ?? 'dev-secret', expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m' },
    );
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub, email, role, jti, typ: 'refresh' },
      { secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret', expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' },
    );
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$executeRaw`
      INSERT INTO "RefreshToken" (id, "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES (${jti}, ${sub}, ${refreshHash}, ${expiresAt}, ${now})
    `;
    return { accessToken, refreshToken, user: { id: sub, email, nickname, role } };
  }

}
