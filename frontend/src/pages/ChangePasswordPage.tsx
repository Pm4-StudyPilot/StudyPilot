import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import { useForm } from '../hooks/useForm';
import { changePasswordSchema } from '../validation/schemas';
import { getPasswordStrength } from '../utils/passwordStrength';

export default function ChangePasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { values, errors, handleChange, validate } = useForm(changePasswordSchema, {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const passwordsMatch =
    values.confirmNewPassword.length > 0 && values.newPassword === values.confirmNewPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.patch<{ message: string }>('/users/me/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activeNav="settings" showSearch={false}>
      <section className="dashboard-page-stack">
        <Link
          to="/settings"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to Settings
        </Link>
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">Security</p>

            <h1>Change Password</h1>

            <p className="dashboard-page-header__subline">
              Update your password to keep your account secure.
            </p>
          </div>
        </header>

        <div className="settings-card-stack">
          <section className="settings-card">
            <div className="settings-card__content">
              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              <Form onSubmit={handleSubmit} error={error}>
                <PasswordField
                  label="Current Password"
                  value={values.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                />

                <PasswordField
                  label="New Password"
                  value={values.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  error={errors.newPassword}
                  autoComplete="new-password"
                />

                <ProgressBar value={getPasswordStrength(values.newPassword)} />

                <div className="mt-2 mb-3 small">...</div>

                <PasswordField
                  label="Confirm New Password"
                  value={values.confirmNewPassword}
                  onChange={(e) => handleChange('confirmNewPassword', e.target.value)}
                  error={errors.confirmNewPassword}
                  autoComplete="new-password"
                />

                {values.confirmNewPassword && (
                  <div
                    className={`auth-check mb-3 ${
                      passwordsMatch ? 'auth-check--valid' : 'auth-check--invalid'
                    }`}
                  >
                    <span className="auth-check__icon">{passwordsMatch ? 'OK' : 'NO'}</span>

                    <span>Passwords match</span>
                  </div>
                )}

                <div className="d-flex gap-2 mt-3">
                  <Button type="submit" loading={loading}>
                    Change Password
                  </Button>

                  <Button type="button" onClick={() => navigate('/settings')}>
                    Cancel
                  </Button>
                </div>
              </Form>
            </div>
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}
