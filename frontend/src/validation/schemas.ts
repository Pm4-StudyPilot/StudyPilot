import { z } from 'zod';

/**
 * Login Schema
 *
 * Defines validation rules for user login.
 *
 * Fields:
 * - identifier: can be either email or username
 * - password: plain-text password
 *
 * Validation:
 * - identifier must not be empty
 * - password must not be empty
 *
 * This schema is used for:
 * - Frontend form validation
 * - Type inference for form data
 */
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register Schema
 *
 * Defines validation rules for user registration.
 *
 * Fields:
 * - email: must be valid email format
 * - username: minimum length of 3 characters
 * - password: minimum length of 8 characters
 * - confirmPassword: must match password
 *
 * Validation rules:
 * - email must be valid
 * - username must be at least 3 characters
 * - password must be at least 12 characters
 * - password must contain at least one uppercase letter
 * - password must contain at least one lowercase letter
 * - password must contain at least one number
 * - password must contain at least one special character
 * - confirmPassword must match password
 *
 * This schema is used for:
 * - Frontend form validation
 * - Ensuring consistent user input before API calls
 *
 */
export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Change Password Schema
 *
 * Defines validation rules for changing a user's password.
 *
 * Fields:
 * - currentPassword: the user's current password (required)
 * - newPassword: the desired new password (must meet security requirements)
 * - confirmNewPassword: must match newPassword
 *
 * Validation rules for newPassword mirror the registration schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

/**
 * Request Password Reset Schema
 *
 * Validates the email field on the "Forgot Password" form.
 */
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Create Course Schema
 *
 * Defines validation rules for creating a new course.
 *
 * Fields:
 * - name: the course name (required, non-empty)
 *
 * This schema is used for:
 * - Frontend form validation in the CreateCourseModal
 */
export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
});

/**
 * Reset Password Schema
 *
 * Validates the new password and confirmation on the "Reset Password" form.
 * Password rules mirror the registration schema.
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });
