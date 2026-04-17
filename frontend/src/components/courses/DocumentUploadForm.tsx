import { useRef, useState } from 'react';

type DocumentUploadFormProps = {
  courseId: string;
  courseName: string;
  onUploadSuccess: () => void;
};

/**
 * DocumentUploadForm
 *
 * Displays a simple upload form for course-related documents.
 *
 * Responsibilities:
 * - Render the selected course context
 * - Render a file input for selecting a document
 * - Keep track of the selected file in local component state
 * - Submit the selected file to the backend upload endpoint
 * - Display success and error feedback to the user
 *
 * Notes:
 * - The course is already selected via the course detail page context
 * - The upload request is sent as multipart/form-data
 */
export default function DocumentUploadForm({
  courseId,
  courseName,
  onUploadSuccess,
}: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formMessage, setFormMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Handles file input changes and stores the selected file in state.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFormMessage('');
  }

  /**
   * Handles upload form submission.
   *
   * Workflow:
   * 1. Prevent the default browser form submission
   * 2. Validate that a file has been selected
   * 3. Read the JWT token from localStorage
   * 4. Build a FormData payload containing the file and courseId
   * 5. Send the upload request to the backend
   * 6. Show a success or error message depending on the response
   *
   * Important:
   * - The project uses a shared API helper (api.ts) for JSON-based requests
   * - File uploads require multipart/form-data, which is not compatible with the
   *   default JSON configuration of the API helper.
   * - Therefore, this upload request is implemented using fetch directly.
   * - The Content-Type header is not set manually, as the browser automatically
   *   adds the correct multipart boundary for FormData.
   */
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
    <div className="course-detail__upload-form rounded p-3 mb-4">
      <h3 className="text-white h5 mb-3">Upload document</h3>

      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
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

        <button type="submit" className="btn btn-primary align-self-start" disabled={!selectedFile}>
          Upload
        </button>
      </form>
    </div>
  );
}
