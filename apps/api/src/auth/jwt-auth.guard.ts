import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing token');
    const [, token] = authHeader.split(' ');
    try {
      const payload = this.jwtService.verify(token);
      const rows = await this.prisma.$queryRaw<Array<{ id: string; email: string; role: string | null; isBanned: boolean | null }>>`
        SELECT id, email, role, "isBanned"
        FROM "User"
        WHERE id = ${payload.sub as string}
          AND "deletedAt" IS NULL
        LIMIT 1
      `;
      const user = rows[0];
      if (!user) throw new UnauthorizedException('Invalid token');
      if (user.isBanned) throw new ForbiddenException('账号已被封禁，请联系管理员');
      request.user = { ...payload, role: user.role ?? 'USER', email: user.email };
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid token');
    }
  }
}
