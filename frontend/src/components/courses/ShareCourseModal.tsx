import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseDto } from '../../types/dto';
import { api } from '../../services/api';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import Button from '../shared/Button';
import { useForm } from '../../hooks/useForm';
import { createShareCourseSchema } from '../../validation/schemas';

interface ShareCourseModalProps {
  course: CourseDto;
  onClose: () => void;
}

export default function ShareCourseModal({ course, onClose }: ShareCourseModalProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createShareCourseSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
    username: '',
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      await api.post(`/courses/${course.id}/share`, { username: values.username.trim() });
      setSuccess(t('courses.share.success'));
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('courses.share.error.unknown');
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('courses.share.title')} onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <p>{t('courses.share.description')}</p>
        <InputField
          id="username"
          label={t('courses.share.usernameOrEmailLabel')}
          value={values.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          autoFocus
          disabled={loading}
        />
        {success && <div className="alert alert-success mt-3">{success}</div>}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t('courses.share.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
