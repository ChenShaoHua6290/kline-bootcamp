import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { SecurityLogService } from '../common/security-log.service';
import { isPasswordStrong, passwordStrengthMessage } from '../auth/password-policy';
import { AdminResetUserPasswordDto, BanUserDto, CreateInviteCodeDto, QuickCreateInviteCodeQueryDto, UpdateInviteCodeDto, UpdateUserAccessDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  async summary() {
    const now = new Date();
    const [totalUsers, bannedUsers, activeInvitationCodes, usedAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.inviteCode.count({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          usedCount: { lt: this.prisma.inviteCode.fields.maxUses },
        },
      }),
      this.prisma.inviteCode.aggregate({
        where: { deletedAt: null },
        _sum: { usedCount: true },
      }),
    ]);

    return {
      totalUsers,
      bannedUsers,
      activeInvitationCodes,
      totalInvitationUsed: Number(usedAgg._sum.usedCount ?? 0),
    };
  }

  async listInvitations() {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        type: string;
        trialDays: number | null;
        dailyTrainingLimit: number | null;
        paidPlan: string | null;
        durationMonths: number | null;
        maxUses: number;
        usedCount: number;
        isActive: boolean;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT id, code, type, "trialDays", "dailyTrainingLimit", "paidPlan", "durationMonths", "maxUses", "usedCount", "isActive", "expiresAt", "createdAt", "updatedAt"
      FROM "InviteCode"
      WHERE "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
    `;
    return rows.map((r) => ({
      ...r,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createInvitation(adminId: string, dto: CreateInviteCodeDto) {
    const code = dto.code.trim();
    const existing = await this.prisma.$queryRaw<Array<{ id: string; deletedAt: Date | null }>>`
      SELECT id, "deletedAt"
      FROM "InviteCode"
      WHERE code = ${code}
      LIMIT 1
    `;
    const row = existing[0];
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const isActive = dto.isActive ?? true;
    const inviteType = dto.type ?? 'INTERNAL';
    const trialDays = inviteType === 'TRIAL' ? dto.trialDays ?? 7 : null;
    const dailyTrainingLimit = inviteType === 'TRIAL' ? dto.dailyTrainingLimit ?? 5 : null;
    const paidPlan = inviteType === 'PAID' ? dto.paidPlan ?? 'MONTHLY' : 'NONE';
    const durationMonths = paidPlan === 'MONTHLY' ? 1 : paidPlan === 'QUARTERLY' ? 3 : paidPlan === 'YEARLY' ? 12 : null;

    if (row && !row.deletedAt) throw new BadRequestException('邀请码已存在');

    if (row && row.deletedAt) {
      await this.prisma.$executeRaw`
        UPDATE "InviteCode"
        SET "deletedAt" = NULL,
            "maxUses" = ${dto.maxUses},
            "usedCount" = 0,
            "isActive" = ${isActive},
            "expiresAt" = ${expiresAt},
            type = CAST(${inviteType} AS "InviteCodeType"),
            "trialDays" = ${trialDays},
            "dailyTrainingLimit" = ${dailyTrainingLimit},
            "paidPlan" = CAST(${paidPlan} AS "AccessPlan"),
            "durationMonths" = ${durationMonths},
            "createdBy" = ${adminId},
            "updatedAt" = ${new Date()}
        WHERE id = ${row.id}
      `;
      await this.securityLogService.logAdminAction({
        adminUserId: adminId,
        action: 'INVITE_CREATE',
        resourceType: 'InviteCode',
        resourceId: row.id,
        detail: `code=${code}`,
      });
      return { ok: true };
    }

    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.$executeRaw`
      INSERT INTO "InviteCode" (
        id, code, "maxUses", "usedCount", "isActive", "expiresAt", "createdBy", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${code}, ${dto.maxUses}, 0, ${isActive}, ${expiresAt}, ${adminId}, ${new Date()}, ${new Date()}
      )
    `;
    await this.prisma.$executeRaw`
      UPDATE "InviteCode"
      SET type = CAST(${inviteType} AS "InviteCodeType"),
          "trialDays" = ${trialDays},
          "dailyTrainingLimit" = ${dailyTrainingLimit},
          "paidPlan" = CAST(${paidPlan} AS "AccessPlan"),
          "durationMonths" = ${durationMonths}
      WHERE id = ${id}
    `;
    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'INVITE_CREATE',
      resourceType: 'InviteCode',
      resourceId: id,
      detail: `code=${code}`,
    });
    return { ok: true };
  }

  async quickCreateInvitation(dto: QuickCreateInviteCodeQueryDto) {
    this.assertQuickInviteSecret(dto.secret);

    const adminRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE role = CAST('ADMIN' AS "UserRole") AND "isBanned" = FALSE
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;
    const adminId = adminRows[0]?.id;
    if (!adminId) throw new BadRequestException('未找到可用管理员账号，无法创建邀请码');

    const code = dto.code?.trim() || (await this.generateUniqueInviteCode());
    const inviteType = dto.type ?? 'TRIAL';
    const maxUses = dto.maxUses ?? 1;
    const expiresInDays = dto.expiresInDays ?? 3;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    await this.createInvitation(adminId, {
      code,
      maxUses,
      expiresAt,
      isActive: true,
      type: inviteType,
      trialDays: inviteType === 'TRIAL' ? dto.trialDays ?? 3 : dto.trialDays,
      dailyTrainingLimit: inviteType === 'TRIAL' ? dto.dailyTrainingLimit ?? 5 : dto.dailyTrainingLimit,
      paidPlan: dto.paidPlan,
    });

    const appUrl = (process.env.APP_URL?.trim() || '').replace(/\/$/, '');
    return {
      ok: true,
      code,
      type: inviteType,
      maxUses,
      expiresAt,
      registerUrl: appUrl ? `${appUrl}/auth` : '/auth',
      message: appUrl ? `${appUrl}/auth?inviteCode=${encodeURIComponent(code)}` : `/auth?inviteCode=${encodeURIComponent(code)}`,
    };
  }

  private assertQuickInviteSecret(input: string) {
    const expected = process.env.AUTO_INVITE_SECRET?.trim();
    if (!expected) throw new ForbiddenException('自动邀请码链接未启用');
    const actualBuffer = Buffer.from(input || '');
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new ForbiddenException('无权生成邀请码');
    }
  }

  private async generateUniqueInviteCode() {
    const prefix = process.env.AUTO_INVITE_PREFIX?.trim() || 'INV';
    for (let i = 0; i < 8; i += 1) {
      const code = `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "InviteCode" WHERE code = ${code} LIMIT 1
      `;
      if (!existing[0]) return code;
    }
    throw new BadRequestException('生成邀请码失败，请重试');
  }

  async updateInvitation(adminId: string, id: string, dto: UpdateInviteCodeDto) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "InviteCode" WHERE id = ${id} AND "deletedAt" IS NULL LIMIT 1
    `;
    if (!existing[0]) throw new NotFoundException('邀请码不存在');

    if (dto.maxUses !== undefined) {
      await this.prisma.$executeRaw`UPDATE "InviteCode" SET "maxUses" = ${dto.maxUses}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    }
    if (dto.isActive !== undefined) {
      await this.prisma.$executeRaw`UPDATE "InviteCode" SET "isActive" = ${dto.isActive}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    }
    if (dto.expiresAt !== undefined) {
      await this.prisma.$executeRaw`UPDATE "InviteCode" SET "expiresAt" = ${new Date(dto.expiresAt)}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    }
    if (dto.trialDays !== undefined) {
      await this.prisma.$executeRaw`UPDATE "InviteCode" SET "trialDays" = ${dto.trialDays}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    }
    if (dto.dailyTrainingLimit !== undefined) {
      await this.prisma.$executeRaw`UPDATE "InviteCode" SET "dailyTrainingLimit" = ${dto.dailyTrainingLimit}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    }
    if (dto.paidPlan !== undefined) {
      const durationMonths = dto.paidPlan === 'MONTHLY' ? 1 : dto.paidPlan === 'QUARTERLY' ? 3 : dto.paidPlan === 'YEARLY' ? 12 : null;
      await this.prisma.$executeRaw`
        UPDATE "InviteCode"
        SET "paidPlan" = CAST(${dto.paidPlan} AS "AccessPlan"),
            "durationMonths" = ${durationMonths},
            "updatedAt" = ${new Date()}
        WHERE id = ${id}
      `;
    }

    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'INVITE_UPDATE',
      resourceType: 'InviteCode',
      resourceId: id,
      detail: JSON.stringify(dto),
    });
    return { ok: true };
  }

  async deleteInvitation(adminId: string, id: string) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "InviteCode" WHERE id = ${id} AND "deletedAt" IS NULL LIMIT 1
    `;
    if (!existing[0]) throw new NotFoundException('邀请码不存在');
    await this.prisma.$executeRaw`
      UPDATE "InviteCode"
      SET "deletedAt" = ${new Date()}, "isActive" = FALSE, "updatedAt" = ${new Date()}
      WHERE id = ${id}
    `;
    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'INVITE_DELETE',
      resourceType: 'InviteCode',
      resourceId: id,
    });
    return { ok: true };
  }

  async listUsers(keyword?: string) {
    const hasKw = Boolean(keyword?.trim());
    const kw = `%${keyword?.trim() ?? ''}%`;
    const rows = hasKw
      ? await this.prisma.$queryRaw<
          Array<{
            id: string;
            email: string;
            nickname: string | null;
            role: string | null;
            accessType: string | null;
            accessStatus: string | null;
            accessStartAt: Date | null;
            accessExpiresAt: Date | null;
            dailyTrainingLimit: number | null;
            isTrainingUnlimited: boolean | null;
            currentPlan: string | null;
            isBanned: boolean | null;
            bannedAt: Date | null;
            banReason: string | null;
            createdAt: Date;
          }>
        >`
          SELECT id, email, nickname, role, "accessType", "accessStatus", "accessStartAt", "accessExpiresAt", "dailyTrainingLimit", "isTrainingUnlimited", "currentPlan", "isBanned", "bannedAt", "banReason", "createdAt"
          FROM "User"
          WHERE email LIKE ${kw} OR nickname LIKE ${kw}
          ORDER BY "createdAt" DESC
        `
      : await this.prisma.$queryRaw<
          Array<{
            id: string;
            email: string;
            nickname: string | null;
            role: string | null;
            accessType: string | null;
            accessStatus: string | null;
            accessStartAt: Date | null;
            accessExpiresAt: Date | null;
            dailyTrainingLimit: number | null;
            isTrainingUnlimited: boolean | null;
            currentPlan: string | null;
            isBanned: boolean | null;
            bannedAt: Date | null;
            banReason: string | null;
            createdAt: Date;
          }>
        >`
          SELECT id, email, nickname, role, "accessType", "accessStatus", "accessStartAt", "accessExpiresAt", "dailyTrainingLimit", "isTrainingUnlimited", "currentPlan", "isBanned", "bannedAt", "banReason", "createdAt"
          FROM "User"
          ORDER BY "createdAt" DESC
        `;

    const out = [];
    for (const u of rows) {
      const [trainingRows, liqRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ c: number }>>`
          SELECT COUNT(1) as c FROM "TrainingSession"
          WHERE "userId" = ${u.id} AND status <> 'ACTIVE'
        `,
        this.prisma.$queryRaw<Array<{ c: number }>>`
          SELECT COUNT(1) as c FROM "TrainingSession"
          WHERE "userId" = ${u.id} AND "isLiquidated" = TRUE
        `,
      ]);
      const usageRows = await this.prisma.$queryRaw<Array<{ c: number | string }>>`
        SELECT "trainingCount" as c
        FROM "UserTrainingDailyUsage"
        WHERE "userId" = ${u.id}
          AND "usageDate" = ${new Date(new Date().setUTCHours(0, 0, 0, 0))}
        LIMIT 1
      `;
      out.push({
        id: u.id,
        email: u.email,
        nickname: u.nickname ?? '',
        role: u.role ?? 'USER',
        isBanned: Boolean(u.isBanned),
        bannedAt: u.bannedAt?.toISOString() ?? null,
        banReason: u.banReason,
        createdAt: u.createdAt.toISOString(),
        accessType: u.accessType ?? 'INTERNAL',
        accessStatus: u.accessStatus ?? 'ACTIVE',
        accessStartAt: u.accessStartAt?.toISOString() ?? null,
        accessExpiresAt: u.accessExpiresAt?.toISOString() ?? null,
        dailyTrainingLimit: u.dailyTrainingLimit,
        isTrainingUnlimited: Boolean(u.isTrainingUnlimited ?? true),
        currentPlan: u.currentPlan ?? 'NONE',
        todayTrainingCount: Number(usageRows[0]?.c ?? 0),
        trainingCount: Number(trainingRows[0]?.c ?? 0),
        liquidationCount: Number(liqRows[0]?.c ?? 0),
      });
    }
    return out;
  }

  async banUser(adminId: string, userId: string, dto: BanUserDto) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; role: string | null }>>`
      SELECT id, role FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    const user = rows[0];
    if (!user) throw new NotFoundException('用户不存在');
    if ((user.role ?? 'USER') === 'ADMIN') throw new BadRequestException('管理员账号不可封禁');

    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "isBanned" = TRUE, "bannedAt" = ${new Date()}, "banReason" = ${dto.reason}
      WHERE id = ${userId}
    `;
    await this.prisma.$executeRaw`
      UPDATE "RefreshToken"
      SET "revokedAt" = ${new Date()}
      WHERE "userId" = ${userId} AND "revokedAt" IS NULL
    `;
    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'USER_BAN',
      resourceType: 'User',
      resourceId: userId,
      targetUserId: userId,
      detail: dto.reason,
    });
    return { ok: true };
  }

  async unbanUser(adminId: string, userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('用户不存在');
    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "isBanned" = FALSE, "bannedAt" = NULL, "banReason" = NULL
      WHERE id = ${userId}
    `;
    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'USER_UNBAN',
      resourceType: 'User',
      resourceId: userId,
      targetUserId: userId,
    });
    return { ok: true };
  }

  async updateUserAccess(adminId: string, userId: string, dto: UpdateUserAccessDto) {
    const users = await this.prisma.$queryRaw<
      Array<{
        id: string;
        accessType: string | null;
        accessStatus: string | null;
        currentPlan: string | null;
        accessExpiresAt: Date | null;
      }>
    >`
      SELECT id, "accessType", "accessStatus", "currentPlan", "accessExpiresAt"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = users[0];
    if (!user) throw new NotFoundException('用户不存在');

    const oldAccessType = user.accessType ?? 'INTERNAL';
    const oldAccessStatus = user.accessStatus ?? 'ACTIVE';
    const oldAccessPlan = user.currentPlan ?? 'NONE';
    const oldExpiresAt = user.accessExpiresAt;

    let nextAccessType = oldAccessType;
    let nextAccessStatus = dto.disabled === true ? 'DISABLED' : oldAccessStatus;
    let nextPlan = oldAccessPlan;
    let nextExpiresAt = oldExpiresAt;
    let nextDailyLimit: number | null | undefined;
    let nextUnlimited: boolean | undefined;

    if (dto.accessType) nextAccessType = dto.accessType;
    if (dto.plan) nextPlan = dto.plan;
    if (dto.accessExpiresAt) nextExpiresAt = new Date(dto.accessExpiresAt);
    if (dto.extendMonths && nextAccessType !== 'INTERNAL') {
      const base = nextExpiresAt && nextExpiresAt.getTime() > Date.now() ? new Date(nextExpiresAt) : new Date();
      const n = new Date(base);
      n.setMonth(n.getMonth() + dto.extendMonths);
      nextExpiresAt = n;
      nextAccessStatus = 'ACTIVE';
    }
    if (nextAccessType === 'TRIAL') {
      nextDailyLimit = dto.dailyTrainingLimit ?? 5;
      nextUnlimited = false;
      if (!nextExpiresAt) {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        nextExpiresAt = d;
      }
    } else if (nextAccessType === 'PAID') {
      nextDailyLimit = null;
      nextUnlimited = true;
      if (!nextExpiresAt) {
        const d = new Date();
        const months = nextPlan === 'QUARTERLY' ? 3 : nextPlan === 'YEARLY' ? 12 : 1;
        d.setMonth(d.getMonth() + months);
        nextExpiresAt = d;
      }
    } else {
      nextPlan = 'NONE';
      nextDailyLimit = null;
      nextUnlimited = true;
      nextExpiresAt = null;
      if (dto.disabled !== true) nextAccessStatus = 'ACTIVE';
    }
    if (dto.disabled === false) nextAccessStatus = 'ACTIVE';

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User"
        SET "accessType" = CAST(${nextAccessType} AS "AccessType"),
            "accessStatus" = CAST(${nextAccessStatus} AS "AccessStatus"),
            "currentPlan" = CAST(${nextPlan} AS "AccessPlan"),
            "accessExpiresAt" = ${nextExpiresAt},
            "dailyTrainingLimit" = ${nextDailyLimit},
            "isTrainingUnlimited" = ${nextUnlimited ?? true},
            "accessStartAt" = COALESCE("accessStartAt", ${now})
        WHERE id = ${userId}
      `;
      if (dto.disabled === true) {
        await tx.$executeRaw`
          UPDATE "RefreshToken" SET "revokedAt" = ${now}
          WHERE "userId" = ${userId} AND "revokedAt" IS NULL
        `;
      }
      if (!dto.extendMonths) {
        const logId = `acl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await tx.$executeRaw`
          INSERT INTO "UserAccessChangeLog" (
            id, "userId", "operatorUserId", action,
            "oldAccessType", "newAccessType", "oldAccessPlan", "newAccessPlan",
            "oldExpiresAt", "newExpiresAt", "oldAccessStatus", "newAccessStatus", remark, "createdAt"
          ) VALUES (
            ${logId}, ${userId}, ${adminId}, ${'ACCESS_UPDATE'},
            CAST(${oldAccessType} AS "AccessType"), CAST(${nextAccessType} AS "AccessType"),
            CAST(${oldAccessPlan} AS "AccessPlan"), CAST(${nextPlan} AS "AccessPlan"),
            ${oldExpiresAt}, ${nextExpiresAt},
            CAST(${oldAccessStatus} AS "AccessStatus"), CAST(${nextAccessStatus} AS "AccessStatus"),
            ${dto.remark ?? null}, ${now}
          )
        `;
      }
    });
    return { ok: true };
  }

  async resetUserPassword(_adminId: string, userId: string, dto: AdminResetUserPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('两次密码不一致');
    if (!isPasswordStrong(dto.newPassword)) throw new BadRequestException(passwordStrengthMessage());

    const users = await this.prisma.$queryRaw<Array<{ id: string; password: string | null }>>`
      SELECT id, password FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    const user = users[0];
    if (!user) throw new NotFoundException('用户不存在');

    if (user.password) {
      const sameAsOld = await bcrypt.compare(dto.newPassword, user.password);
      if (sameAsOld) throw new BadRequestException('新密码不能与旧密码相同');
    }

    const now = new Date();
    const nextHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User" SET password = ${nextHash}
        WHERE id = ${userId}
      `;
      await tx.$executeRaw`
        UPDATE "RefreshToken" SET "revokedAt" = ${now}
        WHERE "userId" = ${userId} AND "revokedAt" IS NULL
      `;
    });

    return { ok: true, message: '用户密码已重置' };
  }
}
