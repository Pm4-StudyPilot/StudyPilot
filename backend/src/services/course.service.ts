import { prisma } from '../config/database';
import { CourseDto, CourseTaskProgressDto } from '../types';
import type { PrismaClient } from '../generated/prisma/client';

const COURSE_OVERVIEW_SELECT = {
  id: true,
  name: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  tasks: {
    select: {
      status: true,
    },
  },
} as const;

type CourseOverviewRecord = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{ status: string }>;
};

export class CourseService {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildTaskProgress(tasks: Array<{ status: string }>): CourseTaskProgressDto {
    const totalTasks = tasks.length;
    const openTasks = tasks.filter((task) => task.status === 'OPEN').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const completionPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      completionPercentage,
    };
  }

  private toCourseDto(course: CourseOverviewRecord): CourseDto {
    const { tasks, ...courseFields } = course;

    return {
      ...courseFields,
      taskProgress: this.buildTaskProgress(tasks),
    };
  }

  async create(name: string, ownerId: string): Promise<CourseDto> {
    const course = await this.db.course.create({
      data: {
        name,
        ownerId,
      },
      select: COURSE_OVERVIEW_SELECT,
    });

    return this.toCourseDto(course);
  }

  async listByOwner(ownerId: string): Promise<CourseDto[]> {
    const courses = await this.db.course.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: COURSE_OVERVIEW_SELECT,
    });

    return courses.map((course) => this.toCourseDto(course));
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<CourseDto | null> {
    const course = await this.db.course.findFirst({
      where: {
        id,
        ownerId,
      },
      select: COURSE_OVERVIEW_SELECT,
    });

    return course ? this.toCourseDto(course) : null;
  }

  async updateForOwner(id: string, ownerId: string, name: string): Promise<CourseDto | null> {
    const existing = await this.findByIdForOwner(id, ownerId);
    if (!existing) {
      return null;
    }

    const course = await this.db.course.update({
      where: { id },
      data: { name },
      select: COURSE_OVERVIEW_SELECT,
    });

    return this.toCourseDto(course);
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
