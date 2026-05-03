import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import Navbar from '../components/shared/layout/Navbar';
import { useForm } from '../hooks/useForm';
import { changePasswordSchema } from '../validation/schemas';
import { getPasswordChecks, getPasswordStrength } from '../utils/passwordStrength';

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
    <>
      <Navbar />
      <div className="settings-shell settings-shell--narrow container">
        <div className="settings-page-header settings-page-header--compact">
          <p className="settings-page-header__eyebrow">Security</p>
          <h1>Change Password</h1>
          <p className="settings-page-header__subline">
            Update your password to keep your account secure.
          </p>
        </div>

        <div className="auth-card auth-card--wide auth-card--themed card">
          <div className="card-body p-4">
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

              <div className="d-flex gap-2 mt-3">
                <Button type="submit" loading={loading}>
                  Change Password
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/')}>
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
