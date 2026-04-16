import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'StudyPilot Backend API',
    version: '1.0.0',
    description: 'Minimal overview of the currently available backend routes.',
  },
  servers: [
    {
      url: '/api',
      description: 'API base path',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          role: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User',
          },
          token: {
            type: 'string',
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          password: {
            type: 'string',
            description: 'Minimum 12 chars, uppercase, lowercase, number, special char.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: {
            type: 'string',
            description: 'Email or username.',
          },
          password: { type: 'string' },
        },
      },
      CheckAvailabilityRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
        },
      },
      CheckAvailabilityResponse: {
        type: 'object',
        properties: {
          emailExists: { type: 'boolean' },
          usernameExists: { type: 'boolean' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string' },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          ownerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateCourseRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      UpdateCourseRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'DONE'] },
          position: { type: 'integer' },
          completed: { type: 'boolean' },
          courseId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTaskRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'DONE'] },
        },
      },
      PatchTaskCompletionRequest: {
        type: 'object',
        required: ['completed'],
        properties: {
          completed: { type: 'boolean' },
        },
      },
    },
  },
} as const;

const options = {
  definition: swaggerDefinition,
  apis: [path.resolve(process.cwd(), 'src/routes/*.ts')],
};

export const swaggerSpec = swaggerJSDoc(options);
