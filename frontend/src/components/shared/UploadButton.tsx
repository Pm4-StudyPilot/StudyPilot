import { useRef, useState } from 'react';

/**
 * Generic upload button component.
 *
 * Handles the file picker, loading state, error/success display, and input reset.
 * Internally calls `POST /api/storage/presigned-url` to get a MinIO presigned PUT URL,
 * then uploads the file directly to MinIO (browser → MinIO, no API server in the data path).
 *
 * @example
 * ```tsx
 * import UploadButton from './components/shared/UploadButton';
 *
 * // Simplest usage — just specify the bucket
 * <UploadButton bucket="avatars">
 *   Upload Avatar
 * </UploadButton>
 *
 * // With success callback to get the resulting key/URL
 * <UploadButton
 *   bucket="course-assets"
 *   onSuccess={(result) => console.log('Uploaded to', result.key)}
 * >
 *   Upload Asset
 * </UploadButton>
 * ```
 */
export interface UploadResult {
  /** The presigned/minio URL the file was uploaded to */
  url: string;
  /** The object key in storage (e.g. "course-assets/171234567890-myfile.pdf") */
  key: string;
}

interface UploadButtonProps {
  /** MinIO bucket to upload to */
  bucket: string;
  /** Optional key prefix for organizing files inside the bucket (default: bucket name) */
  keyPrefix?: string;
  /** Called with the upload result when a file is successfully uploaded */
  onSuccess?: (result: UploadResult) => void;
  /** Called with an error message when upload fails */
  onError?: (message: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  accept?: string;
}

export default function UploadButton({
  bucket,
  keyPrefix,
  onSuccess,
  onError,
  children = 'Upload',
  disabled = false,
  className,
  accept,
}: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('token');

      // 1. Get a presigned write URL from the backend
      const res = await fetch('/api/storage/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bucket, filename: file.name, keyPrefix }),
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { url, key } = await res.json();

      // 2. Upload directly to MinIO (browser → MinIO, no API server in path)
      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('Upload to MinIO failed');

      const uploadResult = { url, key };
      setResult(uploadResult);
      onSuccess?.(uploadResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      onError?.(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        className="d-none"
        onChange={handleChange}
        disabled={disabled || uploading}
        accept={accept}
      />
      <button
        className={`btn btn-secondary${className ? ` ${className}` : ''}`}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" />
            Uploading...
          </>
        ) : (
          children
        )}
      </button>
      {result && (
        <p className="text-success mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
          Uploaded: {result.key}
        </p>
      )}
      {error && (
        <p className="text-danger mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
