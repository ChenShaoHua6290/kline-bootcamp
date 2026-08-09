import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SecurityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logLoginFailed(params: { userId?: string; ip?: string; userAgent?: string; detail?: string }) {
    const id = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.$executeRaw`
      INSERT INTO "SecurityLog" (id, "userId", action, ip, "userAgent", detail, "createdAt")
      VALUES (${id}, ${params.userId ?? null}, CAST(${'LOGIN_FAILED'} AS "AuditAction"), ${params.ip ?? null}, ${params.userAgent ?? null}, ${params.detail ?? null}, ${new Date()})
    `;
  }

  async logAdminAction(params: {
    adminUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    targetUserId?: string;
    detail?: string;
  }) {
    const id = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.$executeRaw`
      INSERT INTO "AdminAuditLog" (
        id, "adminUserId", "targetUserId", action, "resourceType", "resourceId", detail, "createdAt"
      )
      VALUES (
        ${id},
        ${params.adminUserId},
        ${params.targetUserId ?? null},
        CAST(${params.action} AS "AuditAction"),
        ${params.resourceType},
        ${params.resourceId ?? null},
        ${params.detail ?? null},
        ${new Date()}
      )
    `;
  }
}
