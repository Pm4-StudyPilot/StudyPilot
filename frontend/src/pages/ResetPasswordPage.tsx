import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { resetPasswordSchema } from '../validation/schemas';
import { getPasswordChecks, getPasswordStrength } from '../utils/passwordStrength';

/**
 * ResetPasswordPage
 *
 * Allows a user to set a new password after clicking a reset link from their email.
 *
 * Responsibilities:
 * - Read the reset token from the URL query parameter (?token=...)
 * - Render the new password form (newPassword + confirmNewPassword)
 * - Validate input using Zod schema
 * - Send POST request to /auth/reset-password
 * - Display success message and link to login on completion
 *
 * Workflow:
 * 1. Token is extracted from the URL on page load
 * 2. User enters and confirms a new password
 * 3. Form is validated using resetPasswordSchema
 * 4. API request is sent to /auth/reset-password with token + newPassword
 * 5. On success, a confirmation is shown with a link to login
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(resetPasswordSchema, {
    newPassword: '',
    confirmNewPassword: '',
  });

  const passwordChecks = getPasswordChecks(values.newPassword);
  const passwordsMatch =
    values.confirmNewPassword.length > 0 && values.newPassword === values.confirmNewPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container d-flex justify-content-center align-items-center min-vh-100">
        <div className="auth-card auth-card--narrow card shadow">
          <div className="card-body p-4 text-center">
            <h2 className="mb-4">
              <Logo />
            </h2>
            <div className="alert alert-danger" role="alert">
              Invalid or missing reset link. Please request a new one.
            </div>
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="auth-card auth-card--narrow card shadow">
        <div className="card-body p-4">
          <h2 className="text-center mb-4">
            <Logo />
          </h2>
          <h5 className="text-center mb-1">Set New Password</h5>
          <p className="auth-card__lead text-muted text-center mb-4">
            Choose a strong password for your account.
          </p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          ) : (
            <Form onSubmit={handleSubmit} error={error}>
              <PasswordField
                label="New Password"
                value={values.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                error={errors.newPassword}
                autoComplete="new-password"
              />

              <ProgressBar value={getPasswordStrength(values.newPassword)} />

              <div className="mt-2 mb-3 small">
                <div className={passwordChecks.minLength ? 'text-success' : 'text-danger'}>
                  {passwordChecks.minLength ? '✔' : '✖'} At least 12 characters
                </div>
                <div className={passwordChecks.uppercase ? 'text-success' : 'text-danger'}>
                  {passwordChecks.uppercase ? '✔' : '✖'} At least one uppercase letter
                </div>
                <div className={passwordChecks.lowercase ? 'text-success' : 'text-danger'}>
                  {passwordChecks.lowercase ? '✔' : '✖'} At least one lowercase letter
                </div>
                <div className={passwordChecks.number ? 'text-success' : 'text-danger'}>
                  {passwordChecks.number ? '✔' : '✖'} At least one number
                </div>
                <div className={passwordChecks.specialChar ? 'text-success' : 'text-danger'}>
                  {passwordChecks.specialChar ? '✔' : '✖'} At least one special character
                </div>
              </div>

              <PasswordField
                label="Confirm New Password"
                value={values.confirmNewPassword}
                onChange={(e) => handleChange('confirmNewPassword', e.target.value)}
                error={errors.confirmNewPassword}
                autoComplete="new-password"
              />

              {values.confirmNewPassword && (
                <div className={`mb-3 small ${passwordsMatch ? 'text-success' : 'text-danger'}`}>
                  {passwordsMatch ? '✔' : '✖'} Passwords match
                </div>
              )}

              <Button type="submit" className="w-100 mt-2" loading={loading}>
                Reset Password
              </Button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
