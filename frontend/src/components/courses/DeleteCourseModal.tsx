import { useState } from 'react';
import Modal from '../shared/layout/Modal';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';

interface DeleteCourseModalProps {
  course: CourseDto;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

/**
 * DeleteCourseModal
 *
 * Asks the user to confirm before permanently deleting a course.
 *
 * Responsibilities:
 * - Display the course name so the user knows what will be deleted
 * - Send a DELETE request to the backend API on confirmation
 * - Notify the parent with the deleted course id via onDeleted
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. The modal opens with the course name displayed
 * 2. The user clicks "Delete" to confirm or "Cancel" to abort
 * 3. DELETE /courses/:id is called on confirmation
 * 4. The parent is notified with the course id and the modal closes
 */
export default function DeleteCourseModal({ course, onClose, onDeleted }: DeleteCourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handles delete confirmation.
   *
   * Sends the DELETE request and notifies the parent on success.
   */
  async function handleDelete() {
    setError('');
    setLoading(true);

    try {
      await api.delete(`/courses/${course.id}`);
      onDeleted(course.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Delete Course" onClose={onClose}>
      <p className="delete-course-modal__message text-center mb-4">
        Are you sure you want to delete{' '}
        <span className="fw-semibold text-white">{course.name}</span>? This action cannot be undone.
      </p>

      {error && (
        <div className="delete-course-modal__error alert alert-danger py-2 mb-3">{error}</div>
      )}

      <div className="d-flex gap-2">
        <Button
          type="button"
          variant="danger"
          className="w-100"
          loading={loading}
          onClick={handleDelete}
        >
          Delete
        </Button>
        <Button type="button" variant="secondary" className="w-100" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
