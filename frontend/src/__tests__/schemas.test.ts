import { describe, expect, it } from 'vitest';
import { createRequestPasswordResetSchema, createResetPasswordSchema } from '../validation/schemas';

const t = ((key: string) => key) as never;

describe('password reset validation schemas', () => {
  describe('createRequestPasswordResetSchema', () => {
    const schema = createRequestPasswordResetSchema(t);

    it('accepts a valid email', () => {
      expect(schema.safeParse({ email: 'user@example.com' }).success).toBe(true);
    });

    it('rejects an invalid email with the translated message', () => {
      const result = schema.safeParse({ email: 'not-an-email' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.emailInvalid');
      }
    });
  });

  describe('createResetPasswordSchema', () => {
    const schema = createResetPasswordSchema(t);

    it('accepts matching strong passwords', () => {
      const result = schema.safeParse({
        newPassword: 'StrongP@ssword1',
        confirmNewPassword: 'StrongP@ssword1',
      });

      expect(result.success).toBe(true);
    });

    it('rejects when the two passwords do not match', () => {
      const result = schema.safeParse({
        newPassword: 'StrongP@ssword1',
        confirmNewPassword: 'DifferentP@ssword1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const mismatch = result.error.issues.find((issue) =>
          issue.path.includes('confirmNewPassword')
        );
        expect(mismatch?.message).toBe('validation.passwordsDoNotMatch');
      }
    });

    it('rejects a new password that fails the strength rules', () => {
      const result = schema.safeParse({
        newPassword: 'short',
        confirmNewPassword: 'short',
      });

      expect(result.success).toBe(false);
    });
  });
});
