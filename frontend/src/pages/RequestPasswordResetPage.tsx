import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { createRequestPasswordResetSchema } from '../validation/schemas';

export default function RequestPasswordResetPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const schema = useMemo(() => createRequestPasswordResetSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
    email: '',
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<{ message: string }>('/auth/request-password-reset', {
        email: values.email,
      });
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow auth-card--themed card">
        <div className="card-body p-4">
          <div className="auth-card__brand-wrap">
            <h2 className="text-center mb-4">
              <Logo className="auth-card__brand" />
            </h2>
          </div>
          <p className="auth-card__eyebrow">{t('auth.forgotPassword.eyebrow')}</p>
          <h5 className="auth-card__title text-center mb-1">{t('auth.forgotPassword.title')}</h5>
          <p className="auth-card__lead text-center mb-4">{t('auth.forgotPassword.lead')}</p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3">
                <Link to="/login" className="auth-card__muted-link">
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          ) : (
            <>
              <Form onSubmit={handleSubmit} error={error}>
                <InputField
                  label={t('auth.forgotPassword.email')}
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                <Button type="submit" className="w-100" loading={loading}>
                  {t('auth.forgotPassword.submit')}
                </Button>
              </Form>
              <div className="text-center mt-3">
                <Link to="/login" className="auth-card__muted-link">
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
