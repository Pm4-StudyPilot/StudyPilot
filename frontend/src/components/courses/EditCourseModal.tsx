import { FormEvent, useState } from 'react';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createCourseSchema } from '../../validation/schemas';

interface EditCourseModalProps {
  course: CourseDto;
  onClose: () => void;
  onUpdated: (course: CourseDto) => void;
}

/**
 * EditCourseModal
 *
 * Provides the user interface for editing an existing course name.
 *
 * Responsibilities:
 * - Render a form pre-filled with the current course name
 * - Validate input using the createCourseSchema
 * - Send a PATCH request to the backend API
 * - Notify the parent with the updated course via onUpdated
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. The current course name is pre-filled in the input on mount
 * 2. The user edits the name and submits the form
 * 3. PATCH /courses/:id is called with the new name
 * 4. The parent is notified with the updated course and the modal closes
 */
export default function EditCourseModal({ course, onClose, onUpdated }: EditCourseModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill the form with the current course name
  const { values, errors, handleChange, validate } = useForm(createCourseSchema, {
    name: course.name,
  });

  /**
   * Handles form submission.
   *
   * Validates the name, sends the PATCH request, and notifies the parent on success.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const updated = await api.patch<CourseDto>(`/courses/${course.id}`, {
        name: values.name.trim(),
      });
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Edit Course" onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <InputField
          label="Course Name"
          type="text"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          autoFocus
        />
        <Button type="submit" className="w-100" loading={loading}>
          Save Changes
        </Button>
      </Form>
    </Modal>
  );
}
