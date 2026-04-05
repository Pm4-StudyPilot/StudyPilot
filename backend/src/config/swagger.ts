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
    },
  },
} as const;

const options = {
  definition: swaggerDefinition,
  apis: [path.resolve(process.cwd(), 'src/routes/*.ts')],
};

export const swaggerSpec = swaggerJSDoc(options);
