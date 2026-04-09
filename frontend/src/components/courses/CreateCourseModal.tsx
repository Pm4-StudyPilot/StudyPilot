import { FormEvent, useState } from 'react';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createCourseSchema } from '../../validation/schemas';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (course: CourseDto) => void;
}

/**
 * CreateCourseModal
 *
 * Provides the user interface for creating a new course.
 *
 * Responsibilities:
 * - Render a form with a course name input
 * - Validate input using the createCourseSchema
 * - Send a create request to the backend API
 * - Notify the parent with the created course via onCreated
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. User enters a course name
 * 2. Form is validated using createCourseSchema
 * 3. API request is sent to POST /courses
 * 4. Parent is notified with the new course and modal closes
 */
export default function CreateCourseModal({ onClose, onCreated }: CreateCourseModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(createCourseSchema, { name: '' });

  /**
   * Handles form submission.
   *
   * - Prevents default form behavior
   * - Validates the course name
   * - Sends create request to backend
   * - Notifies parent on success
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const course = await api.post<CourseDto>('/courses', { name: values.name.trim() });
      onCreated(course);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="New Course" onClose={onClose}>
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
          Create Course
        </Button>
      </Form>
    </Modal>
  );
}
