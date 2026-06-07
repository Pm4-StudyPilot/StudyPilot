import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSortIcon } from '../../utils/sort';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import DeleteDocumentModal from './DeleteDocumentModal';

type CourseDocumentsListProps = {
  courseId: string;
  refreshKey: number;
  searchTerm?: string;
};

type DocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

type SortDirection = 'asc' | 'desc';

type SortKey<
  T,
  Suffixes extends string = SortDirection,
> = `${Extract<keyof T, string>}:${Suffixes}`;

type DocumentSortableFields = {
  createdAt: string;
  filename: string;
  fileType: string | null;
  fileSize: number | null;
};

type DocumentSortField = keyof DocumentSortableFields;

type DocumentSortOption = SortKey<DocumentSortableFields>;

const defaultSortDirection: Record<DocumentSortField, SortDirection> = {
  createdAt: 'desc',
  fileSize: 'desc',
  filename: 'asc',
  fileType: 'asc',
};

function formatFileSize(bytes: number | null | undefined, unknownLabel: string): string {
  if (!bytes) return unknownLabel;

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
}

function getFileIcon(fileType?: string | null): {
  icon: string;
  colorClass: string;
} {
  const map: Record<string, { icon: string; colorClass: string }> = {
    'application/pdf': {
      icon: 'fa-regular fa-file-pdf',
      colorClass: 'text-danger',
    },

    'application/msword': {
      icon: 'fa-regular fa-file-word',
      colorClass: 'text-primary',
    },

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      icon: 'fa-regular fa-file-word',
      colorClass: 'text-primary',
    },

    'application/vnd.ms-powerpoint': {
      icon: 'fa-regular fa-file-powerpoint',
      colorClass: 'text-warning',
    },

    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      icon: 'fa-regular fa-file-powerpoint',
      colorClass: 'text-warning',
    },

    'application/vnd.ms-excel': {
      icon: 'fa-regular fa-file-excel',
      colorClass: 'text-success',
    },

    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      icon: 'fa-regular fa-file-excel',
      colorClass: 'text-success',
    },

    'text/plain': {
      icon: 'fa-regular fa-file-lines',
      colorClass: 'text-secondary',
    },
  };

  return (
    map[fileType ?? ''] ?? {
      icon: 'fa-regular fa-file',
      colorClass: 'text-secondary',
    }
  );
}

function buildSortOption(field: DocumentSortField, direction: SortDirection): DocumentSortOption {
  return `${field}:${direction}`;
}

export default function CourseDocumentsList({
  courseId,
  refreshKey,
  searchTerm = '',
}: CourseDocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<DocumentSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [actionError, setActionError] = useState('');
  const [pendingActionDocId, setPendingActionDocId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentDto | null>(null);
  const { t } = useTranslation();

  async function handleOpen(doc: DocumentDto) {
    setPendingActionDocId(doc.id);
    setActionError('');
    try {
      const { blob } = await api.getBlob(`/documents/${doc.id}?disposition=inline`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('courses.documents.openFailed'));
    } finally {
      setPendingActionDocId(null);
    }
  }

  async function handleDownload(doc: DocumentDto) {
    setPendingActionDocId(doc.id);
    setActionError('');
    try {
      const { blob, filename } = await api.getBlob(`/documents/${doc.id}?disposition=attachment`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename ?? doc.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('courses.documents.downloadFailed'));
    } finally {
      setPendingActionDocId(null);
    }
  }

  function handleDocumentDeleted(deletedId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
    setDocumentToDelete(null);
  }

  const sort = buildSortOption(sortField, sortDirection);

  const normalizedDocumentSearch = searchTerm.trim().toLowerCase();

  const filteredDocuments = normalizedDocumentSearch
    ? documents.filter((document) =>
        document.filename.toLowerCase().includes(normalizedDocumentSearch)
      )
    : documents;

  function handleSortClick(field: DocumentSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(defaultSortDirection[field]);
  }

  function renderSortIcon(field: DocumentSortField) {
    const icon = getSortIcon(field, sortField, sortDirection);

    if (!icon) return null;

    return <i className={`fa-solid ${icon} ms-1`} aria-hidden="true" />;
  }

  useEffect(() => {
    let isCancelled = false;

    api
      .get<DocumentDto[]>(`/documents/course/${courseId}?sort=${sort}`)
      .then((data) => {
        if (isCancelled) return;
        setDocuments(data);
        setError('');
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : t('courses.documents.loadFailed'));
        setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId, refreshKey, sort, t]);

  const isLoading = status === 'loading';
  const hasError = status === 'error';

  const totalDocs = documents.length;
  const shownDocs = filteredDocuments.length;
  let countLabel: string;
  if (isLoading) {
    countLabel = t('courses.documents.loading');
  } else if (totalDocs === 1) {
    countLabel = t('courses.documents.shownOne', { shown: shownDocs, total: totalDocs });
  } else {
    countLabel = t('courses.documents.shown', { shown: shownDocs, total: totalDocs });
  }

  return (
    <div className="panel course-detail__documents p-4">
      <div className="course-detail__documents-header">
        <h3 className="text-white h5 mb-3">{t('courses.documents.heading')}</h3>

        <p className="course-detail__documents-count mb-0">{countLabel}</p>
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        <span className="text-secondary small">{t('courses.documents.sortBy')}</span>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'createdAt' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('createdAt')}
        >
          {t('courses.documents.sortNewest')}
          {renderSortIcon('createdAt')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'filename' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('filename')}
        >
          {t('courses.documents.sortName')}
          {renderSortIcon('filename')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'fileType' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('fileType')}
        >
          {t('courses.documents.sortType')}
          {renderSortIcon('fileType')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'fileSize' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('fileSize')}
        >
          {t('courses.documents.sortSize')}
          {renderSortIcon('fileSize')}
        </button>
      </div>

      {isLoading && <p className="text-secondary mb-0">{t('courses.documents.loading')}</p>}

      {hasError && <div className="alert alert-danger mb-0">{error}</div>}

      {actionError && (
        <div className="alert alert-danger mb-3" role="alert">
          {actionError}
        </div>
      )}

      {!isLoading && !hasError && documents.length === 0 && (
        <div className="panel  course-detail__placeholder p-4 text-secondary text-center">
          {t('courses.documents.empty')}
        </div>
      )}

      {!isLoading && !hasError && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="course-detail__placeholder rounded p-3 text-secondary text-center">
          {t('courses.documents.emptySearch')}
        </div>
      )}

      {!isLoading && !hasError && filteredDocuments.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {filteredDocuments.map((doc) => {
            const formattedDate = formatDate(doc.createdAt);
            const isPending = pendingActionDocId === doc.id;
            const fileIcon = getFileIcon(doc.fileType);

            return (
              <div
                key={doc.id}
                className="course-document-item"
                data-testid="document-item"
                data-document-name={doc.filename}
              >
                <div className="course-document-item__header">
                  <div className="course-document-item__file">
                    <i className={`${fileIcon.icon} ${fileIcon.colorClass}`} />
                    <span className="text-white fw-semibold text-truncate">{doc.filename}</span>
                  </div>
                </div>

                <div className="course-document-item__meta">
                  <span>{formatFileSize(doc.fileSize, t('courses.documents.unknownSize'))}</span>
                  <span>•</span>
                  <span>{t('courses.documents.updated', { date: formattedDate })}</span>
                </div>

                <div className="course-document-item__actions">
                  <button
                    type="button"
                    className="course-document-item__icon-button"
                    onClick={() => handleOpen(doc)}
                    disabled={isPending}
                    aria-label={t('courses.documents.openAria', { filename: doc.filename })}
                    data-testid="document-open-button"
                  >
                    <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="course-document-item__icon-button"
                    onClick={() => handleDownload(doc)}
                    disabled={isPending}
                    aria-label={t('courses.documents.downloadAria', { filename: doc.filename })}
                    data-testid="document-download-button"
                  >
                    <i className="fa-solid fa-download" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="course-document-item__icon-button course-document-item__icon-button--danger"
                    onClick={() => setDocumentToDelete(doc)}
                    disabled={isPending}
                    aria-label={t('courses.documents.deleteAria', { filename: doc.filename })}
                    data-testid="document-delete-button"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {documentToDelete && (
        <DeleteDocumentModal
          document={documentToDelete}
          onClose={() => setDocumentToDelete(null)}
          onDeleted={handleDocumentDeleted}
        />
      )}
    </div>
  );
}
