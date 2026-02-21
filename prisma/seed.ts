import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const existing = await db.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? 'changeme';
  const hash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      username: 'admin',
      password: hash,
      role: 'admin',
    },
  });

  console.log('Admin user created. Username: admin, Password:', password);
}

main().finally(() => db.$disconnect());
