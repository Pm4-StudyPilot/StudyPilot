import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Button from '../shared/Button';
import { api } from '../../services/api';

interface DeleteDocumentTarget {
  id: string;
  filename: string;
}

interface DeleteDocumentModalProps {
  document: DeleteDocumentTarget;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export default function DeleteDocumentModal({
  document,
  onClose,
  onDeleted,
}: DeleteDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  async function handleDelete() {
    setError('');
    setLoading(true);

    try {
      await api.delete(`/documents/${document.id}`);
      onDeleted(document.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('courses.documents.delete.title')} onClose={onClose}>
      <p className="text-center mb-4">
        <Trans
          i18nKey="courses.documents.delete.confirm"
          values={{ filename: document.filename }}
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
