import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../src/lib/logger';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function createRelativeDate(daysFromNow: number, hours: number = 23, minutes: number = 59): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

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
  logger.info({ id: admin.id }, 'Created admin user');

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
  logger.info({ id: regularUser.id }, 'Created regular user');

  const courses = [
    { name: 'Introduction to Computer Science', color: '#6C63FF', ownerId: admin.id },
    { name: 'Advanced Mathematics', color: '#4DA3FF', ownerId: admin.id },
    { name: 'Physics 101', color: '#00C2A8', ownerId: admin.id },
    { name: 'Creative Writing', color: '#FF8A5B', ownerId: regularUser.id },
  ];

  for (const course of courses) {
    const existing = await prisma.course.findFirst({
      where: { name: course.name, ownerId: course.ownerId },
    });
    if (!existing) {
      await prisma.course.create({ data: course });
      logger.info({ courseName: course.name }, 'Created course');
    } else if (!existing.color) {
      await prisma.course.update({
        where: { id: existing.id },
        data: { color: course.color },
      });
      logger.info({ courseName: course.name }, 'Updated course color');
    } else {
      logger.info({ courseName: course.name }, 'Course already exists');
    }
  }

  const seededCourses = await prisma.course.findMany({
    where: {
      OR: courses.map((course) => ({ name: course.name, ownerId: course.ownerId })),
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  const taskSeeds = [
    {
      courseName: 'Introduction to Computer Science',
      ownerId: admin.id,
      tasks: [
        {
          title: 'Read chapter 1',
          description: 'Review the introduction to programming and computer systems.',
          dueDate: createRelativeDate(-6),
          priority: 'LOW' as const,
          status: 'DONE' as const,
          position: 0,
          completed: true,
        },
        {
          title: 'Finish lab assignment',
          description: 'Complete the Python basics lab and submit the worksheet.',
          dueDate: createRelativeDate(2),
          priority: 'HIGH' as const,
          status: 'IN_PROGRESS' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'Prepare for midterm exam',
          description: 'Study lecture notes and practice sample multiple-choice questions.',
          dueDate: createRelativeDate(7),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
      ],
    },
    {
      courseName: 'Advanced Mathematics',
      ownerId: admin.id,
      tasks: [
        {
          title: 'Finish problem set 3',
          description: 'Work through the calculus exercises and upload solutions.',
          dueDate: createRelativeDate(-3),
          priority: 'MEDIUM' as const,
          status: 'DONE' as const,
          position: 0,
          completed: true,
        },
        {
          title: 'Attend office hours',
          description: 'Clarify the integration techniques from this week.',
          dueDate: createRelativeDate(1, 15, 0),
          priority: 'LOW' as const,
          status: 'IN_PROGRESS' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'Review theorem proofs',
          description: 'Revisit the notes on convergence and series proofs.',
          dueDate: createRelativeDate(5),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
      ],
    },
    {
      courseName: 'Physics 101',
      ownerId: admin.id,
      tasks: [
        {
          title: 'Read chapter on motion',
          description: 'Skim the kinematics section before the next class.',
          dueDate: createRelativeDate(-8),
          priority: 'LOW' as const,
          status: 'DONE' as const,
          position: 0,
          completed: true,
        },
        {
          title: 'Complete mechanics worksheet',
          description: 'Solve force and acceleration problems from the worksheet.',
          dueDate: createRelativeDate(4),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 1,
          completed: false,
        },
      ],
    },
    {
      courseName: 'Creative Writing',
      ownerId: regularUser.id,
      tasks: [
        {
          title: 'Draft short story outline',
          description: 'Sketch the main character arc and conflict.',
          dueDate: createRelativeDate(0),
          priority: 'MEDIUM' as const,
          status: 'IN_PROGRESS' as const,
          position: 0,
          completed: false,
        },
        {
          title: 'Hand in revised poem',
          description: 'Polish the final draft and submit to the course portal.',
          dueDate: createRelativeDate(-1),
          priority: 'HIGH' as const,
          status: 'DONE' as const,
          position: 1,
          completed: true,
        },
        {
          title: 'Read chapter on dialogue',
          description: 'Focus on pacing, rhythm, and natural conversation.',
          dueDate: createRelativeDate(9),
          priority: 'LOW' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
      ],
    },
  ] as const;

  for (const courseSeed of taskSeeds) {
    const course = seededCourses.find(
      (item) => item.name === courseSeed.courseName && item.ownerId === courseSeed.ownerId
    );

    if (!course) {
      logger.warn(
        { courseName: courseSeed.courseName },
        'Skipping task seed because course is missing'
      );
      continue;
    }

    for (const task of courseSeed.tasks) {
      const existingTask = await prisma.task.findFirst({
        where: {
          courseId: course.id,
          title: task.title,
        },
      });

      if (!existingTask) {
        await prisma.task.create({
          data: {
            course: { connect: { id: course.id } },
            user: { connect: { id: courseSeed.ownerId } },
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            position: task.position,
            completed: task.completed,
          },
        });
        logger.info({ courseName: courseSeed.courseName, taskTitle: task.title }, 'Created task');
      } else {
        logger.info(
          { courseName: courseSeed.courseName, taskTitle: task.title },
          'Task already exists'
        );
      }
    }
  }

  const quizSeeds = [
    {
      courseName: 'Introduction to Computer Science',
      ownerId: admin.id,
      quizzes: [
        {
          title: 'Quiz 1: Basics of Programming',
          description: 'Test your understanding of programming fundamentals.',
          isOrderRandom: true,
          questions: [
            {
              title: 'What is the output of the following code snippet? console.log(2 + "2");',
              description: 'Consider type coercion in JavaScript.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                { content: '4', isCorrect: false, position: 0 },
                { content: '22', isCorrect: true, position: 1 },
                { content: 'Error', isCorrect: false, position: 2 },
              ],
            },
            {
              title: 'What is the output of the following code snippet? console.log(2 * "2");',
              description: 'Consider type coercion in JavaScript.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                { content: '4', isCorrect: true, position: 0 },
                { content: '22', isCorrect: true, position: 1 },
                { content: 'Error', isCorrect: false, position: 2 },
              ],
            },
            {
              title: 'What is the output of the following code snippet? console.log(2 - "2");',
              description: 'Consider type coercion in JavaScript.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content: 'TThe correct answer is 0. This is because Javascript is weird.',
                  isCorrect: false,
                  position: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      courseName: 'Creative Writing',
      ownerId: regularUser.id,
      quizzes: [
        {
          title: 'Quiz 1: Elements of a Story',
          description: 'Identify the key components of a narrative.',
          isOrderRandom: false,
          questions: [
            {
              title: 'Which of the following is NOT a common element of a story?',
              description: 'Think about the basic structure of a narrative.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                { content: 'Character', isCorrect: false, position: 0 },
                { content: 'Plot', isCorrect: false, position: 1 },
                { content: 'Setting', isCorrect: false, position: 2 },
                { content: 'Font', isCorrect: true, position: 3 },
              ],
            },
            {
              title: 'Which of the following best describes "setting" in a story?',
              description: 'Consider how the environment influences the narrative.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                {
                  content: 'The time and place where the story occurs',
                  isCorrect: true,
                  position: 0,
                },
                { content: 'The main conflict of the story', isCorrect: false, position: 1 },
                {
                  content: 'The background against which the characters operate',
                  isCorrect: true,
                  position: 2,
                },
                { content: 'The resolution of the story', isCorrect: false, position: 3 },
              ],
            },
          ],
        },
        {
          title: 'Quiz 2: Writing Techniques',
          description: 'Test your knowledge of literary devices and writing styles.',
          isOrderRandom: true,
          questions: [
            {
              title: 'What is "foreshadowing" in literature?',
              description: 'Consider how authors hint at future events.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                { content: 'A technique for developing characters', isCorrect: false, position: 0 },
                { content: 'A method of structuring a plot', isCorrect: false, position: 1 },
                {
                  content: 'A literary device that hints at future events',
                  isCorrect: true,
                  position: 2,
                },
                { content: 'A style of descriptive writing', isCorrect: false, position: 3 },
              ],
            },
          ],
        },
      ],
    },
  ];

  for (const courseSeed of quizSeeds) {
    const course = seededCourses.find(
      (item) => item.name === courseSeed.courseName && item.ownerId === courseSeed.ownerId
    );

    if (!course) {
      logger.warn(
        { courseName: courseSeed.courseName },
        'Skipping quiz seed because course is missing'
      );
      continue;
    }

    for (const quiz of courseSeed.quizzes) {
      const existingQuiz = await prisma.quiz.findFirst({
        where: {
          courseId: course.id,
          title: quiz.title,
        },
      });

      if (!existingQuiz) {
        await prisma.quiz.create({
          data: {
            course: { connect: { id: course.id } },
            title: quiz.title,
            description: quiz.description,
            isOrderRandom: quiz.isOrderRandom,
            questions: {
              create: quiz.questions.map((question) => ({
                title: question.title,
                description: question.description,
                type: question.type,
                position: question.position,
                answers: {
                  create: question.answers.map((answer) => ({
                    content: answer.content,
                    isCorrect: answer.isCorrect,
                    position: answer.position,
                  })),
                },
              })),
            },
          },
        });
        logger.info({ courseName: courseSeed.courseName, quizTitle: quiz.title }, 'Created quiz');
      } else {
        logger.info(
          { courseName: courseSeed.courseName, quizTitle: quiz.title },
          'Quiz already exists'
        );
      }
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
