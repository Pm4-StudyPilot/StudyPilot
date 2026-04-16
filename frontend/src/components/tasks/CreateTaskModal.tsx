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
import { createTaskSchema } from '../../validation/schemas';

interface CreateTaskModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (task: TaskDto) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

/**
 * CreateTaskModal
 *
 * Provides the user interface for creating a new task within a course.
 *
 * Responsibilities:
 * - Render a form with title, description, due date, and priority inputs
 * - Validate input using the createTaskSchema
 * - Send a create request to the backend API
 * - Notify the parent with the created task via onCreated
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. User fills in the task details
 * 2. Form is validated using createTaskSchema
 * 3. API request is sent to POST /courses/:courseId/tasks
 * 4. Parent is notified with the new task and modal closes
 */
export default function CreateTaskModal({ courseId, onClose, onCreated }: CreateTaskModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(createTaskSchema, {
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM' as const,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const payload: Record<string, string> = { title: values.title.trim() };
      if (values.description?.trim()) payload.description = values.description.trim();
      if (values.dueDate) payload.dueDate = values.dueDate;
      if (values.priority) payload.priority = values.priority;

      const task = await api.post<TaskDto>(`/courses/${courseId}/tasks`, payload);
      onCreated(task);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="New Task" onClose={onClose}>
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
          value={values.priority ?? 'MEDIUM'}
          onChange={(e) => handleChange('priority', e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
          options={PRIORITY_OPTIONS}
        />
        <Button type="submit" className="w-100" loading={loading}>
          Create Task
        </Button>
      </Form>
    </Modal>
  );
}
