import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { createResetPasswordSchema } from '../validation/schemas';
import { getPasswordChecks, getPasswordStrength } from '../utils/passwordStrength';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { t } = useTranslation();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createResetPasswordSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
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
      const data = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card auth-card--narrow auth-card--themed card">
          <div className="card-body p-4 text-center">
            <h2 className="mb-4">
              <Logo className="auth-card__brand" />
            </h2>
            <div className="alert alert-danger" role="alert">
              {t('auth.resetPassword.invalidLink')}
            </div>
            <Link to="/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const checkRows: Array<{ key: keyof typeof passwordChecks; valid: boolean }> = [
    { key: 'minLength', valid: passwordChecks.minLength },
    { key: 'uppercase', valid: passwordChecks.uppercase },
    { key: 'lowercase', valid: passwordChecks.lowercase },
    { key: 'number', valid: passwordChecks.number },
    { key: 'specialChar', valid: passwordChecks.specialChar },
  ];

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow auth-card--themed card">
        <div className="card-body p-4">
          <h2 className="text-center mb-4">
            <Logo className="auth-card__brand" />
          </h2>
          <p className="auth-card__eyebrow">{t('auth.resetPassword.eyebrow')}</p>
          <h5 className="auth-card__title text-center mb-1">{t('auth.resetPassword.title')}</h5>
          <p className="auth-card__lead text-center mb-4">{t('auth.resetPassword.lead')}</p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3 auth-card__footer-link">
                <Link to="/login">{t('auth.resetPassword.backToLogin')}</Link>
              </div>
            </>
          ) : (
            <Form onSubmit={handleSubmit} error={error}>
              <PasswordField
                label={t('auth.resetPassword.newPassword')}
                value={values.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                error={errors.newPassword}
                autoComplete="new-password"
              />

              <ProgressBar value={getPasswordStrength(values.newPassword)} />

              <div className="mt-2 mb-3 small">
                {checkRows.map(({ key, valid }) => (
                  <div
                    key={key}
                    className={`auth-check ${valid ? 'auth-check--valid' : 'auth-check--invalid'}`}
                  >
                    <span className="auth-check__icon">{valid ? 'OK' : 'NO'}</span>
                    <span>{t(`auth.passwordChecks.${key}`)}</span>
                  </div>
                ))}
              </div>

              <PasswordField
                label={t('auth.resetPassword.confirmNewPassword')}
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
                  <span>{t('auth.passwordChecks.match')}</span>
                </div>
              )}

              <Button type="submit" className="w-100 mt-2" loading={loading}>
                {t('auth.resetPassword.submit')}
              </Button>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
