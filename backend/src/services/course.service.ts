import { prisma } from '../config/database';
import { CourseDto } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

export class CourseService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async create(name: string, ownerId: string): Promise<CourseDto> {
    return this.db.course.create({
      data: {
        name,
        ownerId,
      },
    });
  }

  async listByOwner(ownerId: string): Promise<CourseDto[]> {
    return this.db.course.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<CourseDto | null> {
    return this.db.course.findFirst({
      where: {
        id,
        ownerId,
      },
    });
  }

  async updateForOwner(id: string, ownerId: string, name: string): Promise<CourseDto | null> {
    const existing = await this.findByIdForOwner(id, ownerId);
    if (!existing) {
      return null;
    }

    return this.db.course.update({
      where: { id },
      data: { name },
    });
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const result = await this.db.course.deleteMany({
      where: {
        id,
        ownerId,
      },
    });

    return result.count > 0;
  }
}
