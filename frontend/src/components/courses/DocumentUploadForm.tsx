import { useState } from 'react';

type DocumentUploadFormProps = {
  courseId: string;
  courseName: string;
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
 * - Provide a submit button for triggering the upload flow later
 *
 * Notes:
 * - The course is already selected via the course detail page context
 * - Backend integration is added in a later step
 */
export default function DocumentUploadForm({ courseId, courseName }: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formMessage, setFormMessage] = useState('');

  /**
   * Handles file input changes and stores the selected file in state.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFormMessage('');
  }

  /**
   * Handles form submission.
   * Backend integration will be added in a later step.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setFormMessage('Please select a file before submitting.');
      return;
    }

    setFormMessage(`Ready to upload "${selectedFile.name}" to ${courseName}.`);
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
            id="document-upload"
            type="file"
            className="form-control"
            onChange={handleFileChange}
          />
        </div>

        {selectedFile && (
          <p className="text-secondary mb-0">
            Selected file: <span className="text-white">{selectedFile.name}</span>
          </p>
        )}

        {formMessage && <div className="alert alert-secondary mb-0">{formMessage}</div>}

        <button type="submit" className="btn btn-primary align-self-start" disabled={!selectedFile}>
          Upload
        </button>
      </form>
    </div>
  );
}
