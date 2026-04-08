import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../src/lib/logger';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin.Password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  logger.info({ email: admin.email }, 'Created admin user');

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'john_doe',
      password: await bcrypt.hash('User.Password123', 10),
      role: Role.USER,
    },
  });
  logger.info({ email: regularUser.email }, 'Created regular user');

  const courses = [
    { name: 'Introduction to Computer Science', ownerId: admin.id },
    { name: 'Advanced Mathematics', ownerId: admin.id },
    { name: 'Physics 101', ownerId: admin.id },
    { name: 'Creative Writing', ownerId: regularUser.id },
  ];

  for (const course of courses) {
    const existing = await prisma.course.findFirst({
      where: { name: course.name, ownerId: course.ownerId },
    });
    if (!existing) {
      await prisma.course.create({ data: course });
      logger.info({ courseName: course.name }, 'Created course');
    } else {
      logger.info({ courseName: course.name }, 'Course already exists');
    }
  }

  logger.info('Seeding complete!');
}

main()
  .catch((e) => {
    logger.error({ err: e }, 'Seeding failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
