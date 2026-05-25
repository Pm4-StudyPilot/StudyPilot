import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';

interface DeleteCourseModalProps {
  course: CourseDto;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export default function DeleteCourseModal({ course, onClose, onDeleted }: DeleteCourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  async function handleDelete() {
    setError('');
    setLoading(true);

    try {
      await api.delete(`/courses/${course.id}`);
      onDeleted(course.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('courses.delete.title')} onClose={onClose}>
      <p className="delete-course-modal__message text-center mb-4">
        <Trans
          i18nKey="courses.delete.confirm"
          values={{ name: course.name }}
          components={{ strong: <span className="fw-semibold text-white" /> }}
        />
      </p>

      {error && (
        <div className="delete-course-modal__error alert alert-danger py-2 mb-3">{error}</div>
      )}

      <div className="d-flex gap-2">
        <Button
          type="button"
          variant="danger"
          className="w-100"
          loading={loading}
          onClick={handleDelete}
        >
          {t('common.buttons.delete')}
        </Button>
        <Button type="button" variant="secondary" className="w-100" onClick={onClose}>
          {t('common.buttons.cancel')}
        </Button>
      </div>
    </Modal>
  );
}
