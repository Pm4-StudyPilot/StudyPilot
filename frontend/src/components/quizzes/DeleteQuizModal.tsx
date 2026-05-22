import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Button from '../shared/Button';
import { api } from '../../services/api';

interface DeleteQuizTarget {
  id: string;
  courseId: string;
  title: string;
}

interface DeleteQuizModalProps {
  quiz: DeleteQuizTarget;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

/**
 * DeleteQuizModal
 *
 * Asks the user to confirm before permanently deleting a quiz.
 *
 * Responsibilities:
 * - Display the quiz title so the user knows what will be deleted
 * - Send a DELETE request to the backend API on confirmation
 * - Notify the parent with the deleted quiz id via onDeleted
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. The modal opens with the quiz title displayed
 * 2. The user clicks "Delete" to confirm or "Cancel" to abort
 * 3. DELETE /courses/:courseId/quizzes/:id is called on confirmation
 * 4. The parent is notified with the quiz id and the modal closes
 */
export default function DeleteQuizModal({ quiz, onClose, onDeleted }: DeleteQuizModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  async function handleDelete() {
    setError('');
    setLoading(true);

    try {
      await api.delete(`/courses/${quiz.courseId}/quizzes/${quiz.id}`);
      onDeleted(quiz.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('quizzes.delete.title')} onClose={onClose}>
      <p className="text-center mb-4">
        <Trans
          i18nKey="quizzes.delete.confirm"
          values={{ title: quiz.title }}
          components={{ strong: <span className="fw-semibold text-white" /> }}
        />
      </p>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

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
