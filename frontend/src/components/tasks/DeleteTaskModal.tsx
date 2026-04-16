import { useState } from 'react';
import Modal from '../shared/layout/Modal';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { TaskDto } from '../../types/dto';

interface DeleteTaskModalProps {
  task: TaskDto;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

/**
 * DeleteTaskModal
 *
 * Asks the user to confirm before permanently deleting a task.
 *
 * Responsibilities:
 * - Display the task title so the user knows what will be deleted
 * - Send a DELETE request to the backend API on confirmation
 * - Notify the parent with the deleted task id via onDeleted
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. The modal opens with the task title displayed
 * 2. The user clicks "Delete" to confirm or "Cancel" to abort
 * 3. DELETE /courses/:courseId/tasks/:id is called on confirmation
 * 4. The parent is notified with the task id and the modal closes
 */
export default function DeleteTaskModal({ task, onClose, onDeleted }: DeleteTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    setLoading(true);

    try {
      await api.delete(`/courses/${task.courseId}/tasks/${task.id}`);
      onDeleted(task.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Delete Task" onClose={onClose}>
      <p className="text-center mb-4">
        Are you sure you want to delete <span className="fw-semibold text-white">{task.title}</span>
        ? This action cannot be undone.
      </p>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

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
