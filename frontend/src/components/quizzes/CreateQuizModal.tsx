import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import CheckField from '../shared/form/CheckField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { QuizDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createCreateQuizSchema } from '../../validation/schemas';

interface CreateQuizModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (quiz: QuizDto) => void;
}

export default function CreateQuizModal({ courseId, onClose, onCreated }: CreateQuizModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const schema = useMemo(() => createCreateQuizSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
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
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('quizzes.create.title')} onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <InputField
          label={t('quizzes.create.titleLabel')}
          type="text"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          autoFocus
        />
        <TextareaField
          label={t('quizzes.create.descriptionLabel')}
          value={values.description ?? ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
        <CheckField
          label={t('quizzes.create.randomOrderLabel')}
          type="checkbox"
          checked={values.isOrderRandom ?? false}
          onChange={(e) => handleChange('isOrderRandom', e.target.checked)}
        />
        <Button type="submit" className="w-100" loading={loading}>
          {t('quizzes.create.submit')}
        </Button>
      </Form>
    </Modal>
  );
}
