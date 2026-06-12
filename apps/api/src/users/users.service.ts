import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.$queryRaw<
      Array<{ id: string; email: string; password: string; nickname: string | null; role: string | null }>
    >`
      SELECT id, email, password, nickname, role
      FROM "User"
      WHERE email = ${email}
        AND "deletedAt" IS NULL
      LIMIT 1
    `.then((rows) => rows[0] ?? null);
  }

  findAnyByEmail(email: string) {
    return this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE email = ${email}
      LIMIT 1
    `.then((rows) => rows[0] ?? null);
  }

  create(email: string, password: string) {
    return this.prisma.user.create({ data: { email, password } });
  }

  findPublicById(id: string) {
    return this.prisma.$queryRaw<
      Array<{ id: string; email: string; nickname: string | null; role: string | null; isBanned: boolean | null }>
    >`
      SELECT id, email, nickname, role, "isBanned"
      FROM "User"
      WHERE id = ${id}
        AND "deletedAt" IS NULL
      LIMIT 1
    `.then((rows) => rows[0] ?? null);
  }
}
