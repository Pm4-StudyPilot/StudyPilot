import { z } from 'zod';
import type { TFunction } from 'i18next';

type T = TFunction;

/**
 * Login Schema factory
 *
 * Returns a Zod schema for the login form. Accepts the i18next `t`
 * function so error messages reflect the active language. Wrap the
 * call site in `useMemo([t], () => createLoginSchema(t))` so the
 * schema rebuilds when the user switches language.
 */
export function createLoginSchema(t: T) {
  return z.object({
    identifier: z.string().min(1, t('validation.identifierRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
}

function passwordRules(t: T) {
  return z
    .string()
    .min(12, t('validation.passwordMin'))
    .regex(/[A-Z]/, t('validation.passwordUppercase'))
    .regex(/[a-z]/, t('validation.passwordLowercase'))
    .regex(/[0-9]/, t('validation.passwordNumber'))
    .regex(/[^A-Za-z0-9]/, t('validation.passwordSpecial'));
}

export function createRegisterSchema(t: T) {
  return z
    .object({
      email: z.email(t('validation.emailInvalid')),
      username: z.string().min(3, t('validation.usernameMin')),
      password: passwordRules(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });
}

export function createChangePasswordSchema(t: T) {
  return z
    .object({
      currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
      newPassword: passwordRules(t),
      confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmNewPassword'],
    });
}

export function createUpdateProfileSchema(t: T) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t('validation.emailInvalid')),
    username: z.string().trim().min(3, t('validation.usernameMin')),
  });
}

export function createRequestPasswordResetSchema(t: T) {
  return z.object({
    email: z.email(t('validation.emailInvalid')),
  });
}

export function createResetPasswordSchema(t: T) {
  return z
    .object({
      newPassword: passwordRules(t),
      confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmNewPassword'],
    });
}

export function createCourseSchema(t: T) {
  return z.object({
    name: z.string().trim().min(1, t('validation.courseNameRequired')),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('validation.courseColorRequired')),
  });
}

export function createEditTaskSchema(t: T) {
  return z.object({
    title: z.string().min(1, t('validation.taskTitleRequired')),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']),
  });
}

export function createCreateTaskSchema(t: T) {
  return z.object({
    title: z.string().min(1, t('validation.taskTitleRequired')),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  });
}

export function createCreateQuizSchema(t: T) {
  return z.object({
    title: z.string().min(1, t('validation.quizTitleRequired')),
    description: z.string().optional(),
    isOrderRandom: z.boolean(),
  });
}
