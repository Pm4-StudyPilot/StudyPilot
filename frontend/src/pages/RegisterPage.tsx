import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

import { createRegisterSchema } from '../validation/schemas';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);

  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);
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
      setServerError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
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

          <p className="auth-card__eyebrow">{t('auth.register.eyebrow')}</p>

          <h1 className="auth-card__title text-center mb-2">{t('auth.register.title')}</h1>

          <p className="auth-card__lead text-center mb-4">{t('auth.register.lead')}</p>

          {serverError && (
            <div className="alert alert-danger" role="alert">
              {serverError}
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <InputField
              label={t('auth.register.username')}
              type="text"
              value={values.username}
              onChange={(e) => handleChange('username', e.target.value)}
              error={errors.username}
              autoComplete="username"
            />

            {usernameExists === true && (
              <small className="text-danger">{t('auth.register.usernameTaken')}</small>
            )}

            {usernameExists === false && (
              <small className="text-success">{t('auth.register.usernameAvailable')}</small>
            )}

            <InputField
              label={t('auth.register.email')}
              type="email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            {emailExists === true && (
              <small className="text-danger">{t('auth.register.emailTaken')}</small>
            )}

            {emailExists === false && (
              <small className="text-success">{t('auth.register.emailAvailable')}</small>
            )}

            <PasswordField
              label={t('auth.register.password')}
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
              {Object.entries(passwordChecks).map(([rule, valid]) => (
                <div
                  key={rule}
                  className={`auth-check ${valid ? 'auth-check--valid' : 'auth-check--invalid'}`}
                >
                  <span className="auth-check__icon">{valid ? 'OK' : 'X'}</span>

                  <span>{t(`auth.passwordChecks.${rule}`)}</span>
                </div>
              ))}
            </div>

            <PasswordField
              label={t('auth.register.confirmPassword')}
              showToggle={true}
              value={values.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {values.confirmPassword.length > 0 && (
              <small className={passwordsMatch ? 'text-success' : 'text-danger'}>
                {passwordsMatch
                  ? t('auth.register.passwordsMatch')
                  : t('auth.register.passwordsDoNotMatch')}
              </small>
            )}

            <Button type="submit" className="w-100 mt-3" loading={loading}>
              {t('auth.register.submit')}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Link to="/login" className="auth-card__muted-link">
              {t('auth.register.haveAccount')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
