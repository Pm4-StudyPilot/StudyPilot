import { Resend } from 'resend';
import { logger } from '../lib/logger';

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('Missing required environment variable: RESEND_API_KEY');
  }
  return key;
}

const RESEND_API_KEY = getResendApiKey();
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'StudyPilot <noreply@studypilot.app>';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/**
 * EmailService
 *
 * Handles all transactional email sending via Resend.
 *
 * Responsibilities:
 * - Send password reset emails
 *
 * This service is used by the AuthService.
 */
export class EmailService {
  private resend = new Resend(RESEND_API_KEY);

  /**
   * Sends a password reset email to the user.
   *
   * @param to Recipient email address
   * @param token Password reset token
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    const { data, error } = await this.resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset your StudyPilot password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>You requested a password reset for your StudyPilot account.</p>
          <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
          <p style="margin: 32px 0;">
            <a href="${resetUrl}"
               style="background-color: #0d6efd; color: #fff; padding: 12px 24px;
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #6c757d; font-size: 14px;">
            If you did not request this, you can safely ignore this email.
            Your password will not change.
          </p>
          <p style="color: #6c757d; font-size: 14px;">
            Or copy this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #0d6efd;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error({ error }, '[EmailService] Failed to send password reset email');
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    logger.info({ id: data?.id }, '[EmailService] Password reset email sent');
  }
}
