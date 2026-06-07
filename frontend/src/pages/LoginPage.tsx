import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { AuthResponse } from '../types/dto';
import Button from '../components/shared/Button';
import Logo from '../components/shared/Logo';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import PasswordField from '../components/shared/form/PasswordField';
import { useForm } from '../hooks/useForm';
import { createLoginSchema } from '../validation/schemas';

/**
 * LoginPage
 *
 * Provides the user interface for user authentication.
 *
 * Responsibilities:
 * - Render login form (identifier + password)
 * - Validate user input using Zod schema
 * - Send login request to backend API
 * - Store authentication data via AuthContext
 * - Redirect user after successful login
 * - Display loading state and error messages
 * - Display loading state, error messages, and logout feedback
 *
 * Workflow:
 * 1. User enters email/username and password
 * 2. Form is validated using loginSchema
 * 3. API request is sent to /auth/login
 * 4. JWT token and user data are stored via AuthContext
 * 5. User is redirected to the home page
 */
export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [logoutMessage, setLogoutMessage] = useState('');

  useEffect(() => {
    const message = sessionStorage.getItem('logoutMessage');
    if (message) {
      setLogoutMessage(message);
      sessionStorage.removeItem('logoutMessage');
    }
  }, []);

  // Initialize form with validation schema
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(loginSchema, {
    identifier: '',
    password: '',
  });

  /**
   * Handles form submission.
   *
   * - Prevents default form behavior
   * - Validates input fields
   * - Sends login request to backend
   * - Stores auth data and redirects user
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        identifier: values.identifier,
        password: values.password,
      });

      // Store token and user in AuthContext
      login(data.token, data.user);

      // Redirect to home/dashboard
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--themed auth-card--narrow card">
        <div className="card-body p-4">
          <div className="auth-card__brand-wrap text-center">
            <Logo />
          </div>

          <p className="auth-card__eyebrow">{t('auth.login.eyebrow')}</p>
          <h1 className="auth-card__title text-center mb-2">{t('auth.login.title')}</h1>
          <p className="auth-card__lead text-center mb-4">{t('auth.login.lead')}</p>

          {logoutMessage && (
            <div className="alert alert-success" role="alert">
              {logoutMessage}
            </div>
          )}

          <Form onSubmit={handleSubmit} error={error}>
            <InputField
              label={t('auth.login.identifier')}
              type="text"
              value={values.identifier}
              onChange={(e) => handleChange('identifier', e.target.value)}
              error={errors.identifier}
              autoComplete="username"
            />

            <PasswordField
              label={t('auth.login.password')}
              showToggle={true}
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button type="submit" className="w-100" loading={loading}>
              {t('auth.login.submit')}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Link to="/register" className="auth-card__muted-link">
              {t('auth.login.needAccount')}
            </Link>
          </div>

          <div className="text-center mt-2">
            <Link to="/forgot-password" className="auth-card__muted-link">
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
