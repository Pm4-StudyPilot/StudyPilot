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

/**
 * Formats bytes into a more readable file size string.
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
 * Converts MIME types into short readable labels.
 */
function formatFileType(fileType?: string | null): string {
  if (!fileType) return 'Unknown type';

  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
  };

  return map[fileType] || fileType;
}

/**
 * CourseDocumentsList
 *
 * Displays uploaded documents for a given course including basic metadata.
 */
export default function CourseDocumentsList({ courseId, refreshKey }: CourseDocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCancelled = false;

    api
      .get<DocumentDto[]>(`/documents/course/${courseId}`)
      .then((data) => {
        if (isCancelled) return;
        setDocuments(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load documents.');
      })
      .finally(() => {
        if (isCancelled) return;
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId, refreshKey]);

  return (
    <div className="course-detail__documents rounded p-3 h-100">
      <h3 className="text-white h5 mb-3">Uploaded documents</h3>

      {loading && <p className="text-secondary mb-0">Loading documents...</p>}

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {!loading && !error && documents.length === 0 && (
        <div className="course-detail__placeholder rounded p-3 text-secondary text-center">
          No documents uploaded yet.
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {documents.map((document) => {
            const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={document.id} className="rounded p-3 border border-secondary-subtle">
                <p className="text-white fw-semibold mb-1">{document.filename}</p>
                <p className="text-secondary mb-0">
                  {formatFileType(document.fileType)} · {formatFileSize(document.fileSize)} ·
                  Uploaded {formattedDate}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
