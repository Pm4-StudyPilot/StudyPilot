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

/**
 * ChangePasswordPage
 *
 * Allows authenticated users to change their password from account settings.
 *
 * Responsibilities:
 * - Render change password form (current password, new password, confirm new password)
 * - Validate input using Zod schema
 * - Send PATCH request to backend API
 * - Display success or error feedback
 *
 * Workflow:
 * 1. User enters current password and new password (twice)
 * 2. Form is validated using changePasswordSchema
 * 3. API PATCH request is sent to /users/me/password
 * 4. Success message is shown on completion
 */
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
      <div className="container d-flex justify-content-center mt-5">
        <div className="card shadow" style={{ maxWidth: '480px', width: '100%' }}>
          <div className="card-body p-4">
            <h4 className="mb-1">Change Password</h4>
            <p className="text-muted mb-4">Update your password to keep your account secure.</p>

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
