import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissions = [
  'order.retry.request','order.retry.approve','order.cancel.request','order.cancel.approve',
  'order.refund.request','order.refund.approve','order.resync.request','order.resync.approve',
  'order.reprocess.request','order.reprocess.approve','order.escalate.request','order.escalate.approve',
  'order.notify.request','order.notify.approve','order.execute',
];

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD must be set');

  const role = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: 'Full Control Tower operational access' },
  });

  for (const code of permissions) {
    const permission = await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, isActive: true },
    create: { username, passwordHash, displayName: username },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  console.log(`Seeded user: ${username}`);
}

main().finally(() => prisma.$disconnect());
