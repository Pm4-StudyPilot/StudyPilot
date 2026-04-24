import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/layout/Navbar';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Button from '../components/shared/Button';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useForm } from '../hooks/useForm';
import { UpdateProfileDto, UserDto } from '../types/dto';
import { updateProfileSchema } from '../validation/schemas';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  async function deleteAccount() {
    try {
      await api.delete<void>('/users/me');
      logout();
      navigate('/login');
      setSuccess('Account has successfully been deleted');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h3 mb-1">Account Settings</h1>
                <p className="text-muted mb-4">Manage your profile and security settings.</p>

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

                <div className="d-flex gap-2 mt-3">
                  <Button onClick={deleteAccount}>Delete Account</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h2 className="h5 mb-2">Security</h2>
                <p className="text-muted">Update your password to keep your account secure.</p>
                <Link to="/settings/password" className="btn btn-outline-primary">
                  Change Password
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
