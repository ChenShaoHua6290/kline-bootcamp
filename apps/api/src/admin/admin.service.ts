import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SecurityLogService } from '../common/security-log.service';
import { BanUserDto, CreateInviteCodeDto, UpdateInviteCodeDto } from './dto';

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
        maxUses: number;
        usedCount: number;
        isActive: boolean;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT id, code, "maxUses", "usedCount", "isActive", "expiresAt", "createdAt", "updatedAt"
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

    if (row && !row.deletedAt) throw new BadRequestException('邀请码已存在');

    if (row && row.deletedAt) {
      await this.prisma.$executeRaw`
        UPDATE "InviteCode"
        SET "deletedAt" = NULL,
            "maxUses" = ${dto.maxUses},
            "usedCount" = 0,
            "isActive" = ${isActive},
            "expiresAt" = ${expiresAt},
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
    await this.securityLogService.logAdminAction({
      adminUserId: adminId,
      action: 'INVITE_CREATE',
      resourceType: 'InviteCode',
      resourceId: id,
      detail: `code=${code}`,
    });
    return { ok: true };
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
            role: string | null;
            isBanned: boolean | null;
            bannedAt: Date | null;
            banReason: string | null;
            createdAt: Date;
          }>
        >`
          SELECT id, email, role, "isBanned", "bannedAt", "banReason", "createdAt"
          FROM "User"
          WHERE email LIKE ${kw}
          ORDER BY "createdAt" DESC
        `
      : await this.prisma.$queryRaw<
          Array<{
            id: string;
            email: string;
            role: string | null;
            isBanned: boolean | null;
            bannedAt: Date | null;
            banReason: string | null;
            createdAt: Date;
          }>
        >`
          SELECT id, email, role, "isBanned", "bannedAt", "banReason", "createdAt"
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
      out.push({
        id: u.id,
        email: u.email,
        role: u.role ?? 'USER',
        isBanned: Boolean(u.isBanned),
        bannedAt: u.bannedAt?.toISOString() ?? null,
        banReason: u.banReason,
        createdAt: u.createdAt.toISOString(),
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
}
