import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) {
    console.log('Skip admin seed: ADMIN_EMAIL or ADMIN_PASSWORD missing');
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed, role: 'ADMIN', isBanned: false, bannedAt: null, banReason: null } as any,
    create: { email: adminEmail, password: hashed, role: 'ADMIN' } as any,
  });
  console.log(`Admin ensured: ${adminEmail}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
