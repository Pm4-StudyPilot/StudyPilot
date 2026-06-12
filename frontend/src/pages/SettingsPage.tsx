import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Button from '../components/shared/Button';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useForm } from '../hooks/useForm';
import { UpdateProfileDto, UserDto } from '../types/dto';
import { createUpdateProfileSchema } from '../validation/schemas';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const schema = useMemo(() => createUpdateProfileSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm<UpdateProfileDto>(schema, {
    username: user?.username ?? '',
    email: user?.email ?? '',
  });

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

      setSuccess(t('settings.profile.successUpdated'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    setError('');
    setSuccess('');
    setDeleteLoading(true);

    try {
      await api.delete<void>('/users/me');
      logout();
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <DashboardLayout activeNav="settings" showSearch={false}>
      <section className="dashboard-page-stack">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">{t('settings.eyebrow')}</p>

            <h1>{t('settings.title')}</h1>

            <p className="dashboard-page-header__subline">{t('settings.subline')}</p>
          </div>
        </header>

        <div className="settings-card-stack">
          <section className="settings-card">
            <div className="settings-card__content">
              <div className="settings-card__header">
                <h2 className="settings-card__title">{t('settings.profile.title')}</h2>

                <p className="settings-card__subtitle">{t('settings.profile.subtitle')}</p>
              </div>

              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              <Form onSubmit={handleSubmit} error={error}>
                <InputField
                  label={t('settings.profile.usernameLabel')}
                  value={values.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  error={errors.username}
                  autoComplete="username"
                />

                <InputField
                  label={t('settings.profile.emailLabel')}
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />

                <div className="d-flex gap-2 mt-3">
                  <Button
                    type="submit"
                    loading={loading}
                    variant="primary"
                    className="bold settings-page__button"
                  >
                    {t('settings.profile.save')}
                  </Button>
                </div>
              </Form>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card__content">
              <div className="settings-card__header">
                <h2 className="settings-card__title">{t('settings.security.title')}</h2>

                <p className="settings-card__subtitle">{t('settings.security.subtitle')}</p>
              </div>

              <Button
                onClick={() => navigate('/settings/password')}
                variant="primary"
                className="bold settings-page__button"
              >
                {t('settings.security.change')}
              </Button>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card__content">
              <div className="settings-card__header">
                <h2 className="settings-card__title">{t('settings.deleteAccount.title')}</h2>

                <p className="settings-card__subtitle">{t('settings.deleteAccount.subtitle')}</p>
              </div>

              <Button
                onClick={deleteAccount}
                loading={deleteLoading}
                variant="danger"
                className="bold settings-page__button"
              >
                {t('settings.deleteAccount.action')}
              </Button>
            </div>
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}
