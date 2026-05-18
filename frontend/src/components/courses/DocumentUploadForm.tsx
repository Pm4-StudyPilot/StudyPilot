import { useRef, useState, ChangeEvent, DragEvent } from 'react';

type DocumentUploadFormProps = {
  courseId: string;
  onUploadSuccess: () => void;
};

export default function DocumentUploadForm({ courseId, onUploadSuccess }: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formMessage, setFormMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setFormMessage('');
  }

  async function uploadFile(file: File | null) {
    selectFile(file);

    if (!file) {
      return;
    }

    setFormMessage('Uploading...');

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setFormMessage('You are not authenticated.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Upload failed.');
      }

      const result = await response.json();

      setFormMessage(`Upload successful: ${result.filename}`);
      setSelectedFile(null);
      onUploadSuccess();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    uploadFile(event.target.files?.[0] ?? null);
  }

  const dragCounter = useRef(0);
  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragCounter.current++;
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);

    uploadFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        id="document-upload"
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <label
        htmlFor="document-upload"
        className={`course-detail__upload-zone ${dragActive ? 'course-detail__upload-zone--active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="course-detail__upload-zone-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19.35 10.04A7.49 7.49 0 0012 4a7.5 7.5 0 00-7.35 6.04A5.5 5.5 0 005.5 20h13a4.5 4.5 0 001.85-8.96z" />
            <path
              d="M12 12v5m0-5l-2 2m2-2l2 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>

        <div className="course-detail__upload-zone-copy">
          <p className="course-detail__upload-zone-title mb-1">Upload Document</p>
          <p className="course-detail__upload-zone-hint mb-0">
            Drag &amp; drop a file here, or click to browse. Max file size: 50MB.
          </p>
        </div>

        {selectedFile && (
          <div className="course-detail__upload-selected">
            Selected file: <strong>{selectedFile.name}</strong>
          </div>
        )}

        {formMessage && (
          <div className="course-detail__upload-status" role="status">
            {formMessage}
          </div>
        )}
      </label>
    </>
  );
}
