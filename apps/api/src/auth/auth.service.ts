import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { SecurityLogService } from '../common/security-log.service';
import { UsersService } from '../users/users.service';
import { AuthDto, RefreshTokenDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  async register(dto: AuthDto) {
    const prisma = this.prisma as any;
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already exists');
    const nickname = (dto.nickname ?? '').trim();
    if (!nickname) throw new BadRequestException('昵称不能为空');
    if (nickname.length < 2 || nickname.length > 20) throw new BadRequestException('昵称长度需在2-20之间');
    if (!/^[\u4e00-\u9fa5A-Za-z0-9_]+$/.test(nickname)) throw new BadRequestException('昵称仅支持中文、英文、数字和下划线');
    const code = dto.inviteCode?.trim();
    if (!code) throw new BadRequestException('邀请码不能为空');
    const invite = await prisma.inviteCode.findFirst({
      where: { code, deletedAt: null },
      select: { id: true, isActive: true, maxUses: true, usedCount: true, expiresAt: true },
    });
    if (!invite) throw new BadRequestException('邀请码错误');
    if (!invite.isActive) throw new BadRequestException('邀请码已失效');
    if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) throw new BadRequestException('邀请码已过期');
    if (invite.usedCount >= invite.maxUses) throw new BadRequestException('邀请码使用次数已达上限');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await prisma.$transaction(async (tx: any) => {
      const latestInvite = await tx.inviteCode.findUnique({
        where: { id: invite.id },
        select: { id: true, isActive: true, maxUses: true, usedCount: true, expiresAt: true },
      });
      if (!latestInvite || !latestInvite.isActive) throw new BadRequestException('邀请码已失效');
      if (latestInvite.expiresAt && latestInvite.expiresAt.getTime() <= Date.now()) throw new BadRequestException('邀请码已过期');
      if (latestInvite.usedCount >= latestInvite.maxUses) throw new BadRequestException('邀请码使用次数已达上限');

      const created = await tx.user.create({ data: { email: dto.email, password: hashed, nickname } });
      await tx.inviteCode.update({
        where: { id: latestInvite.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.inviteCodeRedemption.create({
        data: {
          inviteCodeId: latestInvite.id,
          userId: created.id,
        },
      });
      return created;
    });
    const rows = await this.prisma.$queryRaw<Array<{ role: string | null }>>`
      SELECT role FROM "User" WHERE id = ${user.id} LIMIT 1
    `;
    return this.issueTokens(user.id, user.email, rows[0]?.role ?? 'USER', user.nickname ?? null);
  }

  async login(dto: AuthDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.securityLogService.logLoginFailed({ ip: meta?.ip, userAgent: meta?.userAgent, detail: `email=${dto.email}` });
      throw new UnauthorizedException('Invalid credentials');
    }
    const userRows = await this.prisma.$queryRaw<Array<{ id: string; role: string | null; isBanned: boolean | null }>>`
      SELECT id, role, "isBanned"
      FROM "User"
      WHERE id = ${user.id}
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
