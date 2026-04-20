import { useEffect, useState } from 'react';
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

type DocumentSortOption =
  | 'dateDesc'
  | 'dateAsc'
  | 'nameAsc'
  | 'nameDesc'
  | 'sizeAsc'
  | 'sizeDesc'
  | 'typeAsc'
  | 'typeDesc';

type DocumentSortField = 'date' | 'name' | 'type' | 'size';
type SortDirection = 'asc' | 'desc';

/**
 * Formats a file size in bytes into a human-readable string.
 *
 * Behavior:
 * - values below 1 MB are shown in KB
 * - values from 1 MB onward are shown in MB
 * - missing values fall back to "Unknown size"
 *
 * @param bytes File size in bytes
 * @returns Formatted file size string
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
 *
 * Examples:
 * - application/pdf -> PDF
 * - application/msword -> DOC
 * - text/plain -> TXT
 *
 * Unknown MIME types are returned unchanged.
 *
 * @param fileType MIME type returned by the backend
 * @returns Short display label
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
 *
 * This helps visually distinguish different document types in the compact list.
 * Unknown file types fall back to a generic file icon.
 *
 * @param fileType MIME type returned by the backend
 * @returns Font Awesome icon class string
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
 * Builds the backend sort option from a UI sort field and direction.
 *
 * @param field Selected document sort field
 * @param direction Selected direction
 * @returns Backend-compatible sort option
 */
function buildSortOption(field: DocumentSortField, direction: SortDirection): DocumentSortOption {
  if (field === 'date' && direction === 'desc') return 'dateDesc';
  if (field === 'date' && direction === 'asc') return 'dateAsc';
  if (field === 'name' && direction === 'asc') return 'nameAsc';
  if (field === 'name' && direction === 'desc') return 'nameDesc';
  if (field === 'type' && direction === 'asc') return 'typeAsc';
  if (field === 'type' && direction === 'desc') return 'typeDesc';
  if (field === 'size' && direction === 'asc') return 'sizeAsc';
  return 'sizeDesc';
}

/**
 * CourseDocumentsList
 *
 * Displays uploaded documents for a given course in a compact list layout.
 *
 * Responsibilities:
 * - fetch document metadata for the selected course
 * - refresh the list when a new upload succeeds
 * - send the selected sort option to the backend
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
  const [sortField, setSortField] = useState<DocumentSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortBy = buildSortOption(sortField, sortDirection);

  /**
   * Handles clicks on sort buttons.
   *
   * Behavior:
   * - clicking the active sort field toggles the direction
   * - clicking a different field switches to that field and applies
   *   a sensible default direction
   *
   * Default directions:
   * - date: desc (newest first)
   * - size: desc (largest first)
   * - name/type: asc (alphabetical)
   *
   * @param field Selected sort field
   */
  function handleSortClick(field: DocumentSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);

    switch (field) {
      case 'date':
        setSortDirection('desc');
        break;
      case 'size':
        setSortDirection('desc');
        break;
      case 'name':
      case 'type':
      default:
        setSortDirection('asc');
        break;
    }
  }

  /**
   * Returns a visual arrow indicator for the active sort field.
   *
   * @param field Sort field shown in the button
   * @returns Arrow string for the active field, otherwise empty string
   */
  function getSortIndicator(field: DocumentSortField): string {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  useEffect(() => {
    let isCancelled = false;

    api
      .get<DocumentDto[]>(`/documents/course/${courseId}?sortBy=${sortBy}`)
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
  }, [courseId, refreshKey, sortBy]);

  const isLoading = status === 'loading';
  const hasError = status === 'error';

  return (
    <div className="course-detail__documents rounded p-3 h-100">
      <h3 className="text-white h5 mb-3">Uploaded documents</h3>

      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        <span className="text-secondary small">Sort by:</span>

        <button
          type="button"
          className={`btn btn-sm ${sortField === 'date' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => handleSortClick('date')}
        >
          Newest{getSortIndicator('date')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${sortField === 'name' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => handleSortClick('name')}
        >
          Name{getSortIndicator('name')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${sortField === 'type' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => handleSortClick('type')}
        >
          Type{getSortIndicator('type')}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${sortField === 'size' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => handleSortClick('size')}
        >
          Size{getSortIndicator('size')}
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
