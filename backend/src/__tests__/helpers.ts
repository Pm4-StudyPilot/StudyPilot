import { prisma } from '../config/database';
import { hash } from 'bcrypt';

export async function cleanup() {
  await prisma.courseShare.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(data: { username: string; email: string }) {
  const hashedPassword = await hash('password123', 10);
  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
  });
}

export async function createCourse(data: { ownerId: string }) {
  return prisma.course.create({
    data: {
      name: 'Test Course',
      color: '#FF0000',
      ownerId: data.ownerId,
    },
  });
}

export async function createCourseShare(data: {
  courseId: string;
  sharedByUserId: string;
  sharedWithUserId: string;
}) {
  return prisma.courseShare.create({
    data,
  });
}
