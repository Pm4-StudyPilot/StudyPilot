import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

  const location = useLocation();

  return (
    <DashboardLayout activeNav="courses">
      <section className="dashboard-page-stack">
        <Link
          to={location.state?.from || '/'}
          className="back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          Back
        </Link>
        <div className="settings-shell container">
          <div className="settings-page-header">
            <p className="settings-page-header__eyebrow">Account workspace</p>
            <h1>Account Settings</h1>
            <p className="settings-page-header__subline">
              Manage your profile and security settings.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="settings-card card">
                <div className="card-body p-4">
                  <h2 className="settings-card__title">Profile</h2>
                  <p className="settings-card__subtitle">
                    Update your visible account information.
                  </p>

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
              </div>
            </div>

            <div className="col-lg-5">
              <div className="settings-card card">
                <div className="card-body p-4">
                  <h2 className="settings-card__title">Security</h2>
                  <p className="settings-card__subtitle">
                    Update your password to keep your account secure.
                  </p>
                  <Link to="/settings/password" className="btn btn-outline-primary">
                    Change Password
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
