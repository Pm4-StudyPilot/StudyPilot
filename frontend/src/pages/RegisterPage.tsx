import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';
import { AuthResponse, AvailabilityResponse } from '../types/dto';

import Button from '../components/shared/Button';
import Logo from '../components/shared/Logo';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';

import { useForm } from '../hooks/useForm';

import { getPasswordChecks, getPasswordStrength } from '../utils/passwordStrength';

import { registerSchema } from '../validation/schemas';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);

  const { values, errors, handleChange, validate } = useForm(registerSchema, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const passwordChecks = getPasswordChecks(values.password);

  const passwordsMatch =
    values.confirmPassword.length > 0 && values.password === values.confirmPassword;

  async function checkEmailAvailability(email: string) {
    try {
      const result = await api.post<AvailabilityResponse>('/auth/check-availability', { email });

      setEmailExists(result.emailExists ?? null);
    } catch {
      setEmailExists(null);
    }
  }

  async function checkUsernameAvailability(username: string) {
    try {
      const result = await api.post<AvailabilityResponse>('/auth/check-availability', { username });

      setUsernameExists(result.usernameExists ?? null);
    } catch {
      setUsernameExists(null);
    }
  }

  useEffect(() => {
    if (values.email.trim().length >= 3) {
      const timeout = setTimeout(() => {
        checkEmailAvailability(values.email);
      }, 400);

      return () => clearTimeout(timeout);
    }

    setEmailExists(null);
  }, [values.email]);

  useEffect(() => {
    if (values.username.trim().length >= 3) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(values.username);
      }, 400);

      return () => clearTimeout(timeout);
    }

    setUsernameExists(null);
  }, [values.username]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setServerError('');

    if (!validate()) return;

    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
      });

      login(data.token, data.user);

      navigate('/');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--themed auth-card--wide card">
        <div className="card-body p-4">
          <div className="auth-card__brand-wrap text-center">
            <Logo />
          </div>

          <p className="auth-card__eyebrow">Get started</p>

          <h1 className="auth-card__title text-center mb-2">Create Account</h1>

          <p className="auth-card__lead text-center mb-4">Create your StudyPilot account.</p>

          {serverError && (
            <div className="alert alert-danger" role="alert">
              {serverError}
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <InputField
              label="Username"
              type="text"
              value={values.username}
              onChange={(e) => handleChange('username', e.target.value)}
              error={errors.username}
              autoComplete="username"
            />

            {usernameExists === true && (
              <small className="text-danger">Username already taken</small>
            )}

            {usernameExists === false && <small className="text-success">Username available</small>}

            <InputField
              label="Email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            {emailExists === true && <small className="text-danger">E-mail already in use</small>}

            {emailExists === false && <small className="text-success">E-mail available</small>}

            <PasswordField
              label="Password"
              showToggle={true}
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />

            <div className="mb-3">
              <ProgressBar value={getPasswordStrength(values.password)} />
            </div>

            <div className="d-flex flex-column gap-2 mb-3">
              {Object.entries(passwordChecks).map(([label, valid]) => (
                <div
                  key={label}
                  className={`auth-check ${valid ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{valid ? 'OK' : 'X'}</span>

                  <span>{label}</span>
                </div>
              ))}
            </div>

            <PasswordField
              label="Confirm Password"
              showToggle={true}
              value={values.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {values.confirmPassword.length > 0 && (
              <small className={passwordsMatch ? 'text-success' : 'text-danger'}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </small>
            )}

            <Button type="submit" className="w-100 mt-3" loading={loading}>
              Register
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Link to="/login" className="auth-card__muted-link">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
