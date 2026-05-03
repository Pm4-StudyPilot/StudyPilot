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
      <div className="auth-shell">
        <div className="auth-card auth-card--narrow auth-card--themed card">
          <div className="card-body p-4 text-center">
            <h2 className="mb-4">
              <Logo className="auth-card__brand" />
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
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow auth-card--themed card">
        <div className="card-body p-4">
          <h2 className="text-center mb-4">
            <Logo className="auth-card__brand" />
          </h2>
          <p className="auth-card__eyebrow">Recovery</p>
          <h5 className="auth-card__title text-center mb-1">Set New Password</h5>
          <p className="auth-card__lead text-center mb-4">
            Choose a strong password for your account.
          </p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3 auth-card__footer-link">
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
                <div
                  className={`auth-check ${passwordChecks.minLength ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{passwordChecks.minLength ? 'OK' : 'NO'}</span>
                  <span>At least 12 characters</span>
                </div>
                <div
                  className={`auth-check ${passwordChecks.uppercase ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{passwordChecks.uppercase ? 'OK' : 'NO'}</span>
                  <span>At least one uppercase letter</span>
                </div>
                <div
                  className={`auth-check ${passwordChecks.lowercase ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{passwordChecks.lowercase ? 'OK' : 'NO'}</span>
                  <span>At least one lowercase letter</span>
                </div>
                <div
                  className={`auth-check ${passwordChecks.number ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{passwordChecks.number ? 'OK' : 'NO'}</span>
                  <span>At least one number</span>
                </div>
                <div
                  className={`auth-check ${passwordChecks.specialChar ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">
                    {passwordChecks.specialChar ? 'OK' : 'NO'}
                  </span>
                  <span>At least one special character</span>
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
                <div
                  className={`auth-check mb-3 ${passwordsMatch ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{passwordsMatch ? 'OK' : 'NO'}</span>
                  <span>Passwords match</span>
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
