import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import DeleteDocumentModal from '../components/courses/DeleteDocumentModal';
import { api } from '../services/api';
import { formatDate } from '../utils/formatDate';

type ResourceDocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
  courseId: string;
  course: {
    id: string;
    name: string;
    color: string;
  };
};

type SortDirection = 'asc' | 'desc';

type ResourceSortField = 'createdAt' | 'filename' | 'fileType' | 'fileSize' | 'course';

const defaultSortDirection: Record<ResourceSortField, SortDirection> = {
  createdAt: 'desc',
  filename: 'asc',
  fileType: 'asc',
  fileSize: 'desc',
  course: 'asc',
};

const sortFieldLabels: Record<ResourceSortField, string> = {
  createdAt: 'Newest',
  filename: 'Name',
  fileType: 'Type',
  fileSize: 'Size',
  course: 'Course',
};

/**
 * Converts a file size in bytes into a human-readable string.
 *
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown size';

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
}

/**
 * Returns an icon and color class based on the document MIME type.
 *
 * @param fileType MIME type of the uploaded document
 * @returns Font Awesome icon class and color class
 */
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

/**
 * Resources overview page.
 *
 * Provides a central library for uploaded documents and future
 * AI-generated learning resources.
 */
export default function ResourcesPage() {
  const [documents, setDocuments] = useState<ResourceDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [resourceSearchTerm, setResourceSearchTerm] = useState('');
  const [pendingActionDocId, setPendingActionDocId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ResourceDocumentDto | null>(null);
  const [showAllUploads, setShowAllUploads] = useState(false);
  const [sortField, setSortField] = useState<ResourceSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    let isCancelled = false;
    const limit = showAllUploads ? 50 : 3;

    setLoading(true);

    api
      .get<ResourceDocumentDto[]>(`/documents?sort=createdAt:desc&limit=${limit}`)
      .then((data) => {
        if (isCancelled) return;
        setDocuments(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load resources.');
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [showAllUploads]);

  /**
   * Opens a document in a new browser tab.
   *
   * @param doc Document metadata
   */
  async function handleOpen(doc: ResourceDocumentDto) {
    setPendingActionDocId(doc.id);
    setActionError('');

    try {
      const { blob } = await api.getBlob(`/documents/${doc.id}?disposition=inline`);
      const url = URL.createObjectURL(blob);

      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to open document.');
    } finally {
      setPendingActionDocId(null);
    }
  }

  /**
   * Downloads a document to the user's device.
   *
   * @param doc Document metadata
   */
  async function handleDownload(doc: ResourceDocumentDto) {
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
      setActionError(err instanceof Error ? err.message : 'Failed to download document.');
    } finally {
      setPendingActionDocId(null);
    }
  }

  /**
   * Removes a deleted document from the local resource list.
   *
   * @param deletedId Deleted document id
   */
  function handleDocumentDeleted(deletedId: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== deletedId));
    setDocumentToDelete(null);
  }

  /**
   * Updates the active resource sort field and direction.
   *
   * @param field Field to sort by
   */
  function handleSortClick(field: ResourceSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(defaultSortDirection[field]);
  }

  /**
   * Renders a small sort direction icon for the active sort field.
   *
   * @param field Field represented by the sort button
   * @returns Sort icon or null
   */
  function renderSortIcon(field: ResourceSortField) {
    if (sortField !== field) return null;

    return (
      <i
        className={`fa-solid fa-arrow-${sortDirection === 'asc' ? 'up' : 'down'} ms-1`}
        aria-hidden="true"
      />
    );
  }

  const normalizedResourceSearch = resourceSearchTerm.trim().toLowerCase();

  const filteredDocuments = normalizedResourceSearch
    ? documents.filter((doc) =>
        [doc.filename, doc.fileType ?? '', doc.course.name].some((value) =>
          value.toLowerCase().includes(normalizedResourceSearch)
        )
      )
    : documents;

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'course') return a.course.name.localeCompare(b.course.name) * direction;
    if (sortField === 'filename') return a.filename.localeCompare(b.filename) * direction;
    if (sortField === 'fileType')
      return (a.fileType ?? '').localeCompare(b.fileType ?? '') * direction;
    if (sortField === 'fileSize') return ((a.fileSize ?? 0) - (b.fileSize ?? 0)) * direction;

    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
  });

  const totalDocs = documents.length;
  const shownDocs = sortedDocuments.length;

  return (
    <DashboardLayout
      activeNav="resources"
      showSearch
      searchValue={resourceSearchTerm}
      onSearchChange={setResourceSearchTerm}
      searchPlaceholder="Search your library..."
    >
      <section className="dashboard-page-stack">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">Resource Library</p>
            <h1>Resources</h1>
            <p className="dashboard-page-header__subline">
              Manage your academic library and access AI-generated study material in one unified
              workspace.
            </p>
          </div>
        </header>

        <section className="course-detail panel course-detail__documents p-4">
          <div className="course-detail__documents-header">
            <div>
              <h2 className="text-white h4 mb-2">My Uploads</h2>
              <p className="course-detail__documents-count mb-0">
                {loading ? 'Loading documents...' : `${shownDocs} of ${totalDocs} files shown`}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-link text-decoration-none"
              onClick={() => setShowAllUploads((prev) => !prev)}
              disabled={loading}
            >
              {showAllUploads ? 'Show recent' : 'View all'}
            </button>
          </div>

          {showAllUploads && (
            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <span className="text-secondary small">Sort by:</span>

              {(['createdAt', 'filename', 'fileType', 'fileSize', 'course'] as const).map(
                (field) => (
                  <button
                    key={field}
                    type="button"
                    className={`btn btn-sm ${
                      sortField === field ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => handleSortClick(field)}
                  >
                    {sortFieldLabels[field]}
                    {renderSortIcon(field)}
                  </button>
                )
              )}
            </div>
          )}

          {loading && <p className="text-secondary mb-0">Loading documents...</p>}

          {error && <div className="alert alert-danger mb-0">{error}</div>}

          {actionError && (
            <div className="alert alert-danger mb-3" role="alert">
              {actionError}
            </div>
          )}

          {!loading && !error && documents.length === 0 && (
            <div className="panel course-detail__placeholder p-4 text-secondary text-center">
              No uploaded documents yet.
            </div>
          )}

          {!loading && !error && documents.length > 0 && sortedDocuments.length === 0 && (
            <div className="course-detail__placeholder rounded p-3 text-secondary text-center">
              No resources match your search.
            </div>
          )}

          {!loading && !error && sortedDocuments.length > 0 && !showAllUploads && (
            <div className="resource-file-grid">
              {sortedDocuments.map((doc) => {
                const formattedDate = formatDate(doc.createdAt);
                const isPending = pendingActionDocId === doc.id;
                const fileIcon = getFileIcon(doc.fileType);

                return (
                  <div
                    key={doc.id}
                    className="course-document-item resource-document-card"
                    data-testid="resource-document-card"
                    data-document-name={doc.filename}
                  >
                    <div className="course-document-item__header">
                      <div className="course-document-item__file">
                        <i className={`${fileIcon.icon} ${fileIcon.colorClass}`} />

                        <div className="resource-document-card__content">
                          <Link
                            to={`/courses/${doc.course.id}`}
                            className="resource-document-card__course text-decoration-none"
                          >
                            {doc.course.name}
                          </Link>

                          <span className="text-white fw-semibold text-truncate">
                            {doc.filename}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="course-document-item__meta">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>Updated {formattedDate}</span>
                    </div>

                    <div className="course-document-item__actions">
                      <button
                        type="button"
                        className="course-document-item__icon-button"
                        onClick={() => handleOpen(doc)}
                        disabled={isPending}
                        aria-label={`Open ${doc.filename}`}
                      >
                        <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="course-document-item__icon-button"
                        onClick={() => handleDownload(doc)}
                        disabled={isPending}
                        aria-label={`Download ${doc.filename}`}
                      >
                        <i className="fa-solid fa-download" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="course-document-item__icon-button course-document-item__icon-button--danger"
                        onClick={() => setDocumentToDelete(doc)}
                        disabled={isPending}
                        aria-label={`Delete ${doc.filename}`}
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && sortedDocuments.length > 0 && showAllUploads && (
            <div className="d-flex flex-column gap-2">
              {sortedDocuments.map((doc) => {
                const formattedDate = formatDate(doc.createdAt);
                const isPending = pendingActionDocId === doc.id;
                const fileIcon = getFileIcon(doc.fileType);

                return (
                  <div
                    key={doc.id}
                    className="course-document-item resource-document-card"
                    data-testid="resource-document-item"
                    data-document-name={doc.filename}
                  >
                    <div className="course-document-item__header">
                      <div className="course-document-item__file">
                        <i className={`${fileIcon.icon} ${fileIcon.colorClass}`} />

                        <div className="resource-document-card__content">
                          <Link
                            to={`/courses/${doc.course.id}`}
                            className="resource-document-card__course text-decoration-none"
                          >
                            {doc.course.name}
                          </Link>

                          <span className="text-white fw-semibold text-truncate">
                            {doc.filename}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="course-document-item__meta">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>Updated {formattedDate}</span>
                    </div>

                    <div className="course-document-item__actions">
                      <button
                        type="button"
                        className="course-document-item__icon-button"
                        onClick={() => handleOpen(doc)}
                        disabled={isPending}
                        aria-label={`Open ${doc.filename}`}
                      >
                        <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="course-document-item__icon-button"
                        onClick={() => handleDownload(doc)}
                        disabled={isPending}
                        aria-label={`Download ${doc.filename}`}
                      >
                        <i className="fa-solid fa-download" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="course-document-item__icon-button course-document-item__icon-button--danger"
                        onClick={() => setDocumentToDelete(doc)}
                        disabled={isPending}
                        aria-label={`Delete ${doc.filename}`}
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="course-detail__section-title mb-3">
            <span className="course-detail__section-accent course-detail__section-accent--secondary" />
            <h2>AI Creations</h2>
          </div>

          <div className="panel course-detail__section-card p-4 text-secondary">
            AI-generated resources will be displayed here.
          </div>
        </section>

        {documentToDelete && (
          <DeleteDocumentModal
            document={documentToDelete}
            onClose={() => setDocumentToDelete(null)}
            onDeleted={handleDocumentDeleted}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
