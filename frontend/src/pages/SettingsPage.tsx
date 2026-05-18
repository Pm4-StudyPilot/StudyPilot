import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Button from '../components/shared/Button';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useForm } from '../hooks/useForm';
import { UpdateProfileDto, UserDto } from '../types/dto';
import { updateProfileSchema } from '../validation/schemas';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm<UpdateProfileDto>(
    updateProfileSchema,
    {
      username: user?.username ?? '',
      email: user?.email ?? '',
    }
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!validate()) return;

    setLoading(true);

    try {
      const updatedUser = await api.patch<UserDto>('/users/me', {
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
      });

      updateUser({
        username: updatedUser.username,
        email: updatedUser.email,
      });

      setSuccess('Profile updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activeNav="settings" showSearch={false}>
      <section className="dashboard-page-stack">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">Account workspace</p>

            <h1>Account Settings</h1>

            <p className="dashboard-page-header__subline">
              Manage your profile and security settings.
            </p>
          </div>
        </header>

        <div className="settings-card-stack">
          <section className="settings-card">
            <div className="settings-card__content">
              <div className="settings-card__header">
                <h2 className="settings-card__title">Profile Information</h2>

                <p className="settings-card__subtitle">Update your visible account information.</p>
              </div>

              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              <Form onSubmit={handleSubmit} error={error}>
                <InputField
                  label="Username"
                  value={values.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  error={errors.username}
                  autoComplete="username"
                />

                <InputField
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />

                <div className="d-flex gap-2 mt-3">
                  <Button type="submit" loading={loading}>
                    Save Profile
                  </Button>
                </div>
              </Form>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card__content">
              <div className="settings-card__header">
                <h2 className="settings-card__title">Security</h2>

                <p className="settings-card__subtitle">
                  Update your password to keep your account secure.
                </p>
              </div>

              <Button onClick={() => navigate('/settings/password')}>Change Password</Button>
            </div>
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}
