import { useRef, useState } from 'react';

type DocumentUploadFormProps = {
  courseId: string;
  courseName: string;
  onUploadSuccess: () => void;
};

export default function DocumentUploadForm({
  courseId,
  courseName,
  onUploadSuccess,
}: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formMessage, setFormMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFormMessage('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setFormMessage('Please select a file before submitting.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setFormMessage('You are not authenticated.');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
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

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  return (
    <div className="course-detail__upload-form">
      <div className="course-detail__upload-header">
        <h3 className="course-detail__upload-title">Upload document</h3>
        <p className="course-detail__upload-subtitle mb-0">
          This upload form uses the existing backend endpoint for the current course.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="course-detail__upload-fields">
        <div>
          <label htmlFor="selected-course" className="form-label text-secondary">
            Selected course
          </label>
          <input
            id="selected-course"
            type="text"
            className="form-control"
            value={courseName}
            disabled
            readOnly
          />
          <input type="hidden" name="courseId" value={courseId} />
        </div>

        <div>
          <label htmlFor="document-upload" className="form-label text-secondary">
            Select a file
          </label>
          <input
            ref={fileInputRef}
            id="document-upload"
            type="file"
            className="form-control"
            onChange={handleFileChange}
          />
        </div>

        {formMessage && <div className="alert alert-secondary mb-0">{formMessage}</div>}

        <button
          type="submit"
          className="btn btn-primary course-detail__upload-button"
          disabled={!selectedFile}
        >
          Upload
        </button>
      </form>
    </div>
  );
}
