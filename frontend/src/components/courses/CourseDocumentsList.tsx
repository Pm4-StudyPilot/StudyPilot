import { useEffect, useState } from 'react';
import { getSortIcon } from '../../utils/sort';
import { api } from '../../services/api';

type CourseDocumentsListProps = {
  courseId: string;
  refreshKey: number;
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
 * Converts MIME types into short readable labels for display in the UI.
 */
function formatFileType(fileType?: string | null): string {
  if (!fileType) return 'Unknown';

  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'text/plain': 'TXT',
  };

  return map[fileType] || fileType;
}

/**
 * Returns a Font Awesome icon class for the given document MIME type.
 */
function getFileIcon(fileType?: string | null): string {
  const map: Record<string, string> = {
    'application/pdf': 'fa-regular fa-file-pdf',
    'application/msword': 'fa-regular fa-file-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'fa-regular fa-file-word',
    'application/vnd.ms-powerpoint': 'fa-regular fa-file-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'fa-regular fa-file-powerpoint',
    'text/plain': 'fa-regular fa-file-lines',
  };

  return map[fileType ?? ''] || 'fa-regular fa-file';
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
 * - handle loading, error, and empty states
 * - render each document in a compact row similar to the task list
 *
 * UI layout:
 * - filename and icon on the left
 * - type, upload date, and file size on the right
 */
export default function CourseDocumentsList({ courseId, refreshKey }: CourseDocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<DocumentSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sort = buildSortOption(sortField, sortDirection);

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

  const isLoading = status === 'loading';
  const hasError = status === 'error';

  return (
    <div className="course-detail__documents rounded p-3 h-100">
      <h3 className="text-white h5 mb-3">Uploaded documents</h3>

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

      {!isLoading && !hasError && documents.length === 0 && (
        <div className="course-detail__placeholder rounded p-3 text-secondary text-center">
          No documents uploaded yet.
        </div>
      )}

      {!isLoading && !hasError && documents.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {documents.map((document) => {
            const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={document.id}
                className="course-document-item rounded px-3 py-3 border border-secondary-subtle d-flex align-items-center justify-content-between gap-2"
              >
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <i className={`${getFileIcon(document.fileType)} text-secondary`} />
                  <span className="text-white fw-semibold text-truncate">{document.filename}</span>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap justify-content-md-end">
                  <span className="text-secondary small">
                    Type: {formatFileType(document.fileType)}
                  </span>
                  <span className="text-secondary small">Uploaded: {formattedDate}</span>
                  <span className="text-secondary small">
                    Size: {formatFileSize(document.fileSize)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
