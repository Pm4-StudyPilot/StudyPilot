import { FormEvent, useState } from 'react';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { TaskDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { editTaskSchema } from '../../validation/schemas';

interface EditTaskModalProps {
  task: TaskDto;
  onClose: () => void;
  onUpdated: (task: TaskDto) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

/**
 * EditTaskModal
 *
 * Provides the user interface for editing an existing task.
 *
 * Responsibilities:
 * - Render a form pre-filled with the current task data
 * - Validate input using the editTaskSchema
 * - Send a PATCH request to the backend API
 * - Notify the parent with the updated task via onUpdated
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. All fields are pre-filled with the current task values on mount
 * 2. The user edits the desired fields and submits the form
 * 3. PATCH /courses/:courseId/tasks/:id is called with the updated data
 * 4. The parent is notified with the updated task and the modal closes
 */
export default function EditTaskModal({ task, onClose, onUpdated }: EditTaskModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(editTaskSchema, {
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    priority: task.priority,
    status: task.status,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const updated = await api.patch<TaskDto>(`/courses/${task.courseId}/tasks/${task.id}`, {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        dueDate: values.dueDate || null,
        priority: values.priority,
        status: values.status,
      });
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Edit Task" onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <InputField
          label="Title"
          type="text"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          autoFocus
        />
        <TextareaField
          label="Description"
          value={values.description ?? ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
        <InputField
          label="Due Date"
          type="date"
          value={values.dueDate ?? ''}
          onChange={(e) => handleChange('dueDate', e.target.value)}
        />
        <SelectField
          label="Priority"
          value={values.priority}
          onChange={(e) => handleChange('priority', e.target.value as TaskDto['priority'])}
          options={PRIORITY_OPTIONS}
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(e) => handleChange('status', e.target.value as TaskDto['status'])}
          options={STATUS_OPTIONS}
        />
        <Button type="submit" className="w-100" loading={loading}>
          Save Changes
        </Button>
      </Form>
    </Modal>
  );
}
