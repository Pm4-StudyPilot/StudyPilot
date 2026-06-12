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

  const demoUserPassword = await bcrypt.hash('UserPassword_123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'henzgo@studypilot.ch' },
    update: {
      username: 'Henzgo',
      password: demoUserPassword,
      role: Role.USER,
    },
    create: {
      email: 'henzgo@studypilot.ch',
      username: 'Henzgo',
      password: demoUserPassword,
      role: Role.USER,
    },
  });
  logger.info({ id: demoUser.id }, 'Created demo user');

  const sharingDemoUserPassword = await bcrypt.hash('UserPassword_123', 10);
  const sharingDemoUser = await prisma.user.upsert({
    where: { email: 'gordon@blackmesa.com' },
    update: {
      username: 'Gordon',
      password: sharingDemoUserPassword,
      role: Role.USER,
    },
    create: {
      email: 'gordon@blackmesa.com',
      username: 'Gordon',
      password: sharingDemoUserPassword,
      role: Role.USER,
    },
  });
  logger.info({ id: sharingDemoUser.id }, 'Created sharing demo user');

  const courses = [
    { name: 'Introduction to Computer Science', color: '#6C63FF', ownerId: admin.id },
    { name: 'Advanced Mathematics', color: '#4DA3FF', ownerId: admin.id },
    { name: 'Physics 101', color: '#00C2A8', ownerId: admin.id },
    { name: 'Creative Writing', color: '#FF8A5B', ownerId: regularUser.id },
    { name: 'Visual Computing 1', color: '#6C63FF', ownerId: demoUser.id },
    { name: 'Artificial Intelligence 1', color: '#00C2A8', ownerId: demoUser.id },
    { name: 'Computertechnik 2', color: '#FF8A5B', ownerId: demoUser.id },
    { name: 'Digital Image Processing', color: '#4DA3FF', ownerId: sharingDemoUser.id },
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
    {
      courseName: 'Visual Computing 1',
      ownerId: demoUser.id,
      tasks: [
        {
          title: 'Kameramodell und Koordinatensysteme wiederholen',
          description:
            'Repetiere Kameramodelle, Koordinatensysteme und Transformationen fuer die naechste Uebung.',
          dueDate: createRelativeDate(2),
          priority: 'HIGH' as const,
          status: 'IN_PROGRESS' as const,
          position: 0,
          completed: false,
        },
        {
          title: '2D/3D Transformationsuebung abschliessen',
          description:
            'Berechne die Transformationsmatrizen und teste die Beispiele zur geometrischen Repraesentation.',
          dueDate: createRelativeDate(5),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'Bildverarbeitung: Filter und Segmentierung zusammenfassen',
          description:
            'Erstelle eine kurze Zusammenfassung zu Kontrastanpassung, Rotation und Segmentierung.',
          dueDate: createRelativeDate(3),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
        {
          title: 'WebGL Mini-Demo vorbereiten',
          description:
            'Bereite eine kleine WebGL-Szene mit Licht, Farben und Texturen fuer die Praktika vor.',
          dueDate: createRelativeDate(-2),
          priority: 'MEDIUM' as const,
          status: 'DONE' as const,
          position: 3,
          completed: true,
        },
      ],
    },
    {
      courseName: 'Artificial Intelligence 1',
      ownerId: demoUser.id,
      tasks: [
        {
          title: 'Suchalgorithmen mit A* und Heuristiken ueben',
          description:
            'Loese Beispiele zu A*, heuristischer Suche und Pfadplanung fuer die naechste Praxis.',
          dueDate: createRelativeDate(1),
          priority: 'HIGH' as const,
          status: 'IN_PROGRESS' as const,
          position: 0,
          completed: false,
        },
        {
          title: 'Minimax-Beispiel fuer 2048 nachvollziehen',
          description:
            'Analysiere die Zustandsbewertung und die Entscheidungslogik fuer ein Spiel-KI-Beispiel.',
          dueDate: createRelativeDate(4),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'CNN-Grundlagen fuer Bilderkennung repetieren',
          description:
            'Wiederhole Faltung, Feature Maps und Klassifikation fuer die Deep-Learning-Einheit.',
          dueDate: createRelativeDate(8),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
        {
          title: 'Einfuehrung: intelligente Agenten lesen',
          description:
            'Lies die Einfuehrung zu Agenten, Umgebungen und Problemformulierungen im Skript.',
          dueDate: createRelativeDate(-3),
          priority: 'LOW' as const,
          status: 'DONE' as const,
          position: 3,
          completed: true,
        },
      ],
    },
    {
      courseName: 'Computertechnik 2',
      ownerId: demoUser.id,
      tasks: [
        {
          title: 'Lab SPI 1 mit Oszilloskop vorbereiten',
          description:
            'Gehe die SPI-Signale durch und notiere, welche Messpunkte im Labor relevant sind.',
          dueDate: createRelativeDate(2),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 0,
          completed: false,
        },
        {
          title: 'Timer PWM fuer RGB-LEDs implementieren',
          description:
            'Implementiere eine Timer-basierte PWM-Steuerung und teste die Farbwechsel mit LEDs.',
          dueDate: createRelativeDate(6),
          priority: 'MEDIUM' as const,
          status: 'IN_PROGRESS' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'ADC Messwerte auswerten',
          description:
            'Vergleiche Rohwerte und Spannungen und dokumentiere die wichtigsten Erkenntnisse.',
          dueDate: createRelativeDate(10),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
        {
          title: 'Microcontroller Basics wiederholen',
          description:
            'Wiederhole Register, Buszyklen und grundlegende C-Code-Strukturen aus den ersten Wochen.',
          dueDate: createRelativeDate(-4),
          priority: 'LOW' as const,
          status: 'DONE' as const,
          position: 3,
          completed: true,
        },
      ],
    },
    {
      courseName: 'Digital Image Processing',
      ownerId: sharingDemoUser.id,
      tasks: [
        {
          title: 'Midterm und Lab 6 vorbereiten',
          description:
            'Wiederhole Intensitaetstransformationen, Spatial Domain Processing und Color Image Processing.',
          dueDate: createRelativeDate(2),
          priority: 'HIGH' as const,
          status: 'IN_PROGRESS' as const,
          position: 0,
          completed: false,
        },
        {
          title: 'Color Image Processing Zusammenfassung schreiben',
          description:
            'Fasse Farbraeume, Kanaele und typische Farboperationen fuer die Pruefungsvorbereitung zusammen.',
          dueDate: createRelativeDate(4),
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          position: 1,
          completed: false,
        },
        {
          title: 'Finding Lines and Edges Aufgaben loesen',
          description:
            'Bearbeite Beispiele zu Kanten, Gradienten und Linienerkennung aus der Uebung.',
          dueDate: createRelativeDate(7),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 2,
          completed: false,
        },
        {
          title: 'Segmentation und Feature Extraction repetieren',
          description:
            'Bereite Stichworte zu Segmentierung, Merkmalen und Klassifikation fuer die zweite Kurshaelfte vor.',
          dueDate: createRelativeDate(11),
          priority: 'MEDIUM' as const,
          status: 'OPEN' as const,
          position: 3,
          completed: false,
        },
        {
          title: 'Mini Project: JPEG Compression Idee skizzieren',
          description: 'Notiere eine kurze Projektidee zu JPEG-Kompression oder Image Formation.',
          dueDate: createRelativeDate(-1),
          priority: 'LOW' as const,
          status: 'DONE' as const,
          position: 4,
          completed: true,
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
    {
      courseName: 'Visual Computing 1',
      ownerId: demoUser.id,
      quizzes: [
        {
          title: 'Visual Computing Grundlagen',
          description:
            'Kurzer Check zu Bildgenerierung, 2D/3D-Transformationen und Computer Vision.',
          isOrderRandom: false,
          questions: [
            {
              title: 'Was beschreibt Rasterung in der Computergrafik am besten?',
              description:
                'Denke daran, wie geometrische Formen am Ende als Pixelbild dargestellt werden.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                {
                  content: 'Die Umwandlung von Vektor- oder Geometriedaten in Pixel',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Das Speichern eines Bildes als verlustfreie ZIP-Datei',
                  isCorrect: false,
                  position: 1,
                },
                {
                  content: 'Das Trainieren eines neuronalen Netzes mit Bilddaten',
                  isCorrect: false,
                  position: 2,
                },
              ],
            },
            {
              title: 'Welche Aussagen zu Transformationen und Koordinatensystemen sind korrekt?',
              description:
                'Mehrere Antworten koennen richtig sein. Es geht um typische 2D/3D-Pipelines.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                {
                  content:
                    'Translation, Rotation und Skalierung lassen sich als Matrizen darstellen.',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content:
                    'Homogene Koordinaten helfen, mehrere Transformationen einheitlich zu verknuepfen.',
                  isCorrect: true,
                  position: 1,
                },
                {
                  content:
                    'Eine Transformation veraendert immer die Texturdatei auf der Festplatte.',
                  isCorrect: false,
                  position: 2,
                },
                {
                  content:
                    'Objekt-, Welt- und Kamerakoordinaten beschreiben verschiedene Bezugssysteme.',
                  isCorrect: true,
                  position: 3,
                },
              ],
            },
            {
              title: 'Computer Vision vs. Computer Graphics',
              description:
                'Erklaere kurz den Unterschied zwischen Bildanalyse und Bildgenerierung.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content:
                    'Computer Graphics erzeugt Bilder aus Modellen und Szenen. Computer Vision analysiert Bilder oder Videos, um Informationen wie Objekte, Strukturen oder Bewegungen zu erkennen.',
                  isCorrect: true,
                  position: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      courseName: 'Artificial Intelligence 1',
      ownerId: demoUser.id,
      quizzes: [
        {
          title: 'AI 1 Methodencheck',
          description:
            'Repetition zu intelligenten Agenten, Suche, Planen und Deep-Learning-Grundlagen.',
          isOrderRandom: true,
          questions: [
            {
              title: 'Was ist ein intelligenter Agent im KI-Kontext?',
              description: 'Beziehe dich auf Wahrnehmung, Umgebung und Aktionen.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                {
                  content:
                    'Ein System, das seine Umgebung wahrnimmt und Aktionen auswaehlt, um Ziele zu erreichen.',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Eine Datenbank, die nur Trainingsbilder speichert.',
                  isCorrect: false,
                  position: 1,
                },
                {
                  content: 'Ein Algorithmus, der ausschliesslich zufaellige Entscheidungen trifft.',
                  isCorrect: false,
                  position: 2,
                },
              ],
            },
            {
              title: 'Welche Methoden passen zu Suche, Planen und Problemlosen?',
              description: 'Waehle alle passenden Antworten aus.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                { content: 'A* Suche mit Heuristik', isCorrect: true, position: 0 },
                { content: 'Minimax fuer Spielentscheidungen', isCorrect: true, position: 1 },
                {
                  content: 'Constraint Satisfaction Problems',
                  isCorrect: true,
                  position: 2,
                },
                {
                  content: 'CSS-Media-Queries fuer responsive Layouts',
                  isCorrect: false,
                  position: 3,
                },
              ],
            },
            {
              title: 'Deep Learning, CNNs und Transformers',
              description:
                'Beschreibe, wofuer CNNs und Transformers typischerweise eingesetzt werden.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content:
                    'CNNs sind stark fuer raeumliche Muster in Bildern, etwa Kanten und Objekte. Transformers modellieren Beziehungen ueber Sequenzen oder Tokens und werden breit fuer Text, Bilder und multimodale Aufgaben genutzt.',
                  isCorrect: true,
                  position: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      courseName: 'Computertechnik 2',
      ownerId: demoUser.id,
      quizzes: [
        {
          title: 'Computertechnik 2 Repetition',
          description:
            'Kurze Wiederholung zu GPIO, seriellen Schnittstellen, Timern, ADC und Speicher.',
          isOrderRandom: false,
          questions: [
            {
              title: 'Wofuer steht GPIO bei einem Microcontroller?',
              description: 'Es geht um universell nutzbare digitale Ein- und Ausgaenge.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                {
                  content: 'General Purpose Input/Output',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Graphics Processing Input/Output',
                  isCorrect: false,
                  position: 1,
                },
                {
                  content: 'Global Program Interrupt Operator',
                  isCorrect: false,
                  position: 2,
                },
              ],
            },
            {
              title: 'Welche Aussagen zu SPI, UART und I2C sind korrekt?',
              description: 'Mehrere Antworten koennen richtig sein.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                {
                  content: 'SPI verwendet typischerweise getrennte Leitungen fuer Daten und Clock.',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'UART uebertraegt asynchron, also ohne gemeinsame Clock-Leitung.',
                  isCorrect: true,
                  position: 1,
                },
                {
                  content: 'I2C nutzt Adressen, damit mehrere Geraete am Bus haengen koennen.',
                  isCorrect: true,
                  position: 2,
                },
                {
                  content: 'Alle drei Protokolle speichern Programme dauerhaft im ROM.',
                  isCorrect: false,
                  position: 3,
                },
              ],
            },
            {
              title: 'Interrupt Performance und Cache',
              description:
                'Erklaere kurz, warum Interrupt-Latenz und Cache-Verhalten fuer eingebettete Systeme relevant sind.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content:
                    'Interrupt-Latenz bestimmt, wie schnell ein System auf externe Ereignisse reagiert. Cache kann Zugriffe beschleunigen, aber auch Timing schwerer vorhersagbar machen.',
                  isCorrect: true,
                  position: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      courseName: 'Digital Image Processing',
      ownerId: sharingDemoUser.id,
      quizzes: [
        {
          title: 'DIP Midterm Check',
          description:
            'Repetition zu Intensitaetstransformationen, Spatial Domain Processing und Farbbildern.',
          isOrderRandom: false,
          questions: [
            {
              title: 'Was ist das Ziel einer Intensitaetstransformation?',
              description:
                'Denke an Operationen, die Pixelwerte veraendern, ohne die Bildgeometrie zu verschieben.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                {
                  content:
                    'Pixelwerte werden angepasst, um Kontrast, Helligkeit oder Dynamikbereich zu veraendern.',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Das Bild wird immer in ein 3D-Modell umgerechnet.',
                  isCorrect: false,
                  position: 1,
                },
                {
                  content: 'Alle Kanten werden automatisch als Vektorgrafik gespeichert.',
                  isCorrect: false,
                  position: 2,
                },
              ],
            },
            {
              title: 'Welche Themen gehoeren zum Spatial Domain Processing?',
              description: 'Waehle alle passenden Antworten aus.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                {
                  content: 'Filteroperationen direkt auf Bildpixeln',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Glaettung oder Schaerfung mit lokalen Nachbarschaften',
                  isCorrect: true,
                  position: 1,
                },
                {
                  content: 'Morphologische Operationen wie Erosion und Dilatation',
                  isCorrect: true,
                  position: 2,
                },
                {
                  content: 'Ausschliesslich Netzwerk-Routing zwischen Servern',
                  isCorrect: false,
                  position: 3,
                },
              ],
            },
            {
              title: 'Color Image Processing',
              description: 'Erklaere kurz, warum Farbraeume und einzelne Farbkanaele wichtig sind.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content:
                    'Farbraeume beschreiben Farben unterschiedlich, zum Beispiel RGB oder HSV. Einzelne Kanaele koennen getrennt verarbeitet werden, um Farbe, Helligkeit oder Segmentierung gezielter zu steuern.',
                  isCorrect: true,
                  position: 0,
                },
              ],
            },
          ],
        },
        {
          title: 'DIP Pipeline und Mini Project',
          description:
            'Quiz zu Kanten, Segmentierung, Feature Extraction, Klassifikation und JPEG-Kompression.',
          isOrderRandom: true,
          questions: [
            {
              title: 'Wozu dienen Edge-Detection-Verfahren?',
              description: 'Denke an lokale Helligkeitsaenderungen und Strukturen in Bildern.',
              type: 'SINGLE_CHOICE' as const,
              position: 0,
              answers: [
                {
                  content:
                    'Sie markieren starke lokale Aenderungen, die oft Objektgrenzen oder Linien entsprechen.',
                  isCorrect: true,
                  position: 0,
                },
                {
                  content: 'Sie ersetzen jede Datei automatisch durch ein kleineres JPEG.',
                  isCorrect: false,
                  position: 1,
                },
                {
                  content: 'Sie entfernen zwingend alle Farben aus einem Bild.',
                  isCorrect: false,
                  position: 2,
                },
              ],
            },
            {
              title: 'Welche Schritte koennen in einer Bildanalyse-Pipeline vorkommen?',
              description: 'Mehrere Antworten koennen richtig sein.',
              type: 'MULTIPLE_CHOICE' as const,
              position: 1,
              answers: [
                { content: 'Segmentation', isCorrect: true, position: 0 },
                { content: 'Feature Extraction', isCorrect: true, position: 1 },
                { content: 'Classification', isCorrect: true, position: 2 },
                {
                  content: 'Manuelles Abschalten der Datenbankmigration',
                  isCorrect: false,
                  position: 3,
                },
              ],
            },
            {
              title: 'JPEG Compression und Mini Project',
              description:
                'Beschreibe kurz, warum JPEG fuer ein Mini Project interessant sein kann.',
              type: 'CARD' as const,
              position: 2,
              answers: [
                {
                  content:
                    'JPEG zeigt zentrale DIP-Konzepte wie Transformation, Quantisierung und verlustbehaftete Kompression. In einem Mini Project kann man sichtbar untersuchen, wie Qualitaet und Dateigroesse zusammenhaengen.',
                  isCorrect: true,
                  position: 0,
                },
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
