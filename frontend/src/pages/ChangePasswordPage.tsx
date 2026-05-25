import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import { useForm } from '../hooks/useForm';
import { createChangePasswordSchema } from '../validation/schemas';
import { getPasswordStrength } from '../utils/passwordStrength';

export default function ChangePasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const schema = useMemo(() => createChangePasswordSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

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
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activeNav="settings" showSearch={false}>
      <section className="dashboard-page-stack">
        <Link
          to="/settings"
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          {t('settings.changePassword.back')}
        </Link>
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">
              {t('settings.changePassword.eyebrow')}
            </p>

            <h1>{t('settings.changePassword.title')}</h1>

            <p className="dashboard-page-header__subline">
              {t('settings.changePassword.subline')}
            </p>
          </div>
        </header>

        <div className="settings-card-stack">
          <section className="settings-card">
            <div className="settings-card__content">
              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              <Form onSubmit={handleSubmit} error={error}>
                <PasswordField
                  label={t('settings.changePassword.currentLabel')}
                  value={values.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                />

                <PasswordField
                  label={t('settings.changePassword.newLabel')}
                  value={values.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  error={errors.newPassword}
                  autoComplete="new-password"
                />

                <ProgressBar value={getPasswordStrength(values.newPassword)} />

                <div className="mt-2 mb-3 small">...</div>

                <PasswordField
                  label={t('settings.changePassword.confirmLabel')}
                  value={values.confirmNewPassword}
                  onChange={(e) => handleChange('confirmNewPassword', e.target.value)}
                  error={errors.confirmNewPassword}
                  autoComplete="new-password"
                />

                {values.confirmNewPassword && (
                  <div
                    className={`auth-check mb-3 ${
                      passwordsMatch ? 'auth-check--valid' : 'auth-check--invalid'
                    }`}
                  >
                    <span className="auth-check__icon">{passwordsMatch ? 'OK' : 'NO'}</span>

                    <span>{t('auth.passwordChecks.match')}</span>
                  </div>
                )}

                <div className="d-flex gap-2 mt-3">
                  <Button
                    type="submit"
                    loading={loading}
                    className="btn btn-primary bold settings-page__button"
                  >
                    {t('settings.changePassword.submit')}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="btn btn-primary bold settings-page__button"
                  >
                    {t('settings.changePassword.cancel')}
                  </Button>
                </div>
              </Form>
            </div>
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}
