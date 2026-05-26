import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseDto } from '../../types/dto';
import { api } from '../../services/api';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import Button from '../shared/Button';

interface ShareCourseModalProps {
  course: CourseDto;
  onClose: () => void;
}

export default function ShareCourseModal({ course, onClose }: ShareCourseModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post(`/courses/${course.id}/share`, { username });
      setSuccess(t('courses.share.success'));
      setUsername('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('courses.share.error.unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('courses.share.title')} onClose={onClose}>
      <Form onSubmit={handleSubmit}>
        <p>{t('courses.share.description', { courseName: course.name })}</p>
        <InputField
          id="username"
          label={t('courses.share.usernameOrEmailLabel')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
        />
        {error && <div className="alert alert-danger mt-3">{error}</div>}
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
