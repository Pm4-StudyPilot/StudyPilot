import { FormEvent, useState } from 'react';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import CheckField from '../shared/form/CheckField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { QuizDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createQuizSchema } from '../../validation/schemas';

interface CreateQuizModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (quiz: QuizDto) => void;
}

/**
 * CreateQuizModal
 *
 * Provides the user interface for creating a new quiz within a course.
 *
 * Responsibilities:
 * - Render a form with title, description and isOrderRandom inputs
 * - Validate input using the createQuizSchema
 * - Send a create request to the backend API
 * - Notify the parent with the created quiz via onCreated
 * - Display loading state and error messages
 *
 * Workflow:
 * 1. User fills in the quiz details
 * 2. Form is validated using createQuizSchema
 * 3. API request is sent to POST /courses/:courseId/quizzes
 * 4. Parent is notified with the new quiz and modal closes
 */
export default function CreateQuizModal({ courseId, onClose, onCreated }: CreateQuizModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(createQuizSchema, {
    title: '',
    description: '',
    isOrderRandom: false,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const payload: Record<string, string | boolean> = {
        title: values.title.trim(),
        isOrderRandom: values.isOrderRandom,
      };
      if (values.description?.trim()) payload.description = values.description.trim();

      const quiz = await api.post<QuizDto>(`/courses/${courseId}/quizzes`, payload);
      onCreated(quiz);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="New Quiz" onClose={onClose}>
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
        <CheckField
          label="Random question order"
          type="checkbox"
          checked={values.isOrderRandom ?? false}
          onChange={(e) => handleChange('isOrderRandom', e.target.checked)}
        />
        <Button type="submit" className="w-100" loading={loading}>
          Create Quiz
        </Button>
      </Form>
    </Modal>
  );
}
