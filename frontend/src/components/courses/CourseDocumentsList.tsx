import { useEffect, useState } from 'react';
import { getSortIcon } from '../../utils/sort';
import { api } from '../../services/api';
import DeleteDocumentModal from './DeleteDocumentModal';

// Props for the CourseDocumentsList component.
type CourseDocumentsListProps = {
  courseId: string;
  refreshKey: number;
  searchTerm?: string;
};

// Represents a document returned by the backend API.
type DocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

// Available sort directions for document sorting.
type SortDirection = 'asc' | 'desc';

/**
 * Generic helper type for backend-compatible sort query strings.
 *
 * Example:
 * - "filename:asc"
 * - "createdAt:desc"
 */
type SortKey<
  T,
  Suffixes extends string = SortDirection,
> = `${Extract<keyof T, string>}:${Suffixes}`;

/**
 * Defines all sortable document fields supported
 * by the backend sorting API.
 */
type DocumentSortableFields = {
  createdAt: string;
  filename: string;
  fileType: string | null;
  fileSize: number | null;
};

// Available sortable document fields.
type DocumentSortField = keyof DocumentSortableFields;

// Current backend-compatible sort query value.
type DocumentSortOption = SortKey<DocumentSortableFields>;

// Default sort direction per sortable field.
const defaultSortDirection: Record<DocumentSortField, SortDirection> = {
  createdAt: 'desc',
  fileSize: 'desc',
  filename: 'asc',
  fileType: 'asc',
};

/**
 * Formats a file size in bytes into a human-readable string.
 */
function formatFileSize(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
}

/**
 * Returns a Font Awesome icon class for the given document MIME type.
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
 * Builds a backend-compatible sort query value.
 *
 * Format:
 * - "<field>:<direction>"
 *
 * Examples:
 * - "createdAt:desc"
 * - "filename:asc"
 */
function buildSortOption(field: DocumentSortField, direction: SortDirection): DocumentSortOption {
  return `${field}:${direction}`;
}

/**
 * CourseDocumentsList
 *
 * Displays uploaded documents for a given course in a compact list layout.
 *
 * Responsibilities:
 * - fetch document metadata for the selected course
 * - refresh the list when a new upload succeeds
 * - send the selected generic sort value to the backend
 * - allow toggling sort direction per field
 * - filter documents by filename using the current search term
 * - handle loading, error, and empty states
 * - render each document in a compact row similar to the task list
 *
 * UI layout:
 * - filename and icon on the left
 * - type, upload date, and file size on the right
 */
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

  /**
   * Opens a document in a new browser tab.
   *
   * Workflow:
   * 1. Fetch the document with disposition=inline so the browser knows
   *    it can display PDFs/images directly when supported.
   * 2. Wrap the response Blob in an object URL.
   * 3. Open the object URL in a new tab.
   * 4. Revoke the object URL after a short delay so the new tab has time
   *    to take ownership of it.
   *
   * If the browser cannot natively display the MIME type, it will fall back
   * to its standard download behavior — that is the expected and desired
   * fallback.
   */
  async function handleOpen(doc: DocumentDto) {
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
   * Triggers a browser download for the selected document.
   *
   * Workflow:
   * 1. Fetch the document with disposition=attachment.
   * 2. Wrap the response Blob in an object URL.
   * 3. Programmatically click a hidden <a download> to trigger the
   *    browser's native download flow.
   * 4. Revoke the object URL once the download has been initiated.
   *
   * Uses the filename returned by the backend (parsed from the
   * Content-Disposition header) so the saved file matches the original
   * upload name, falling back to the stored DTO filename otherwise.
   */
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
      setActionError(err instanceof Error ? err.message : 'Failed to download document.');
    } finally {
      setPendingActionDocId(null);
    }
  }

  /**
   * Removes a deleted document from local state.
   *
   * The list is updated in-place rather than by refetching, since the
   * backend has already confirmed the delete and we want immediate
   * feedback for the user.
   */
  function handleDocumentDeleted(deletedId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
    setDocumentToDelete(null);
  }

  const sort = buildSortOption(sortField, sortDirection);

  /**
   * Normalized search term used for
   * case-insensitive document filtering.
   */
  const normalizedDocumentSearch = searchTerm.trim().toLowerCase();

  /**
   * Filters documents by filename using the current search term.
   *
   * If no search term is provided, all documents are returned.
   */
  const filteredDocuments = normalizedDocumentSearch
    ? documents.filter((document) =>
        document.filename.toLowerCase().includes(normalizedDocumentSearch)
      )
    : documents;

  /**
   * Handles clicks on sort buttons.
   *
   * Behavior:
   * - clicking the active sort field toggles the direction
   * - clicking a different field switches to that field and applies
   *   a field-specific default direction
   */
  function handleSortClick(field: DocumentSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(defaultSortDirection[field]);
  }

  /**
   * Renders the sort icon for the active sort field.
   */
  function renderSortIcon(field: DocumentSortField) {
    const icon = getSortIcon(field, sortField, sortDirection);

    if (!icon) return null;

    return <i className={`fa-solid ${icon} ms-1`} aria-hidden="true" />;
  }

  /**
   * Fetches documents whenever:
   * - the course changes
   * - a document upload refresh is triggered
   * - the sort configuration changes
   */
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
        setError(err instanceof Error ? err.message : 'Failed to load documents.');
        setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId, refreshKey, sort]);

  // Indicates whether document data is currently loading.
  const isLoading = status === 'loading';

  // Indicates whether the document request failed.
  const hasError = status === 'error';

  /**
   * Renders the document list including:
   * - sorting controls
   * - loading and error states
   * - filtered document results
   */
  return (
    <div className="panel course-detail__documents p-4">
      <div className="course-detail__documents-header">
        <h3 className="text-white h5 mb-3">Uploaded documents</h3>

        <p className="course-detail__documents-count mb-0">
          {isLoading
            ? 'Loading documents...'
            : `${filteredDocuments.length} of ${documents.length} file${documents.length !== 1 ? 's' : ''} shown`}
        </p>
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        <span className="text-secondary small">Sort by:</span>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'createdAt' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('createdAt')}
        >
          Newest{renderSortIcon('createdAt')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'filename' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('filename')}
        >
          Name{renderSortIcon('filename')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'fileType' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('fileType')}
        >
          Type{renderSortIcon('fileType')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${
            sortField === 'fileSize' ? 'btn-primary' : 'btn-outline-secondary'
          }`}
          onClick={() => handleSortClick('fileSize')}
        >
          Size{renderSortIcon('fileSize')}
        </button>
      </div>

      {isLoading && <p className="text-secondary mb-0">Loading documents...</p>}

      {hasError && <div className="alert alert-danger mb-0">{error}</div>}

      {actionError && (
        <div className="alert alert-danger mb-3" role="alert">
          {actionError}
        </div>
      )}

      {!isLoading && !hasError && documents.length === 0 && (
        <div className="panel  course-detail__placeholder p-4 text-secondary text-center">
          No documents uploaded yet.
        </div>
      )}

      {!isLoading && !hasError && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="course-detail__placeholder rounded p-3 text-secondary text-center">
          No documents match your search.
        </div>
      )}

      {!isLoading && !hasError && filteredDocuments.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {filteredDocuments.map((doc) => {
            const formattedDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            const isPending = pendingActionDocId === doc.id;

            const fileIcon = getFileIcon(doc.fileType);

            return (
              <div key={doc.id} className="course-document-item">
                <div className="course-document-item__header">
                  <div className="course-document-item__file">
                    <i className={`${fileIcon.icon} ${fileIcon.colorClass}`} />
                    <span className="text-white fw-semibold text-truncate">{doc.filename}</span>
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
