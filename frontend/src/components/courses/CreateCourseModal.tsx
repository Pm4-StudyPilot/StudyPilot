import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createCourseSchema } from '../../validation/schemas';
import CourseColorField from './CourseColorField';
import { COURSE_COLOR_PALETTE } from '../../utils/courseColors';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (course: CourseDto) => void;
}

export default function CreateCourseModal({ onClose, onCreated }: CreateCourseModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const schema = useMemo(() => createCourseSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
    name: '',
    color: COURSE_COLOR_PALETTE[0],
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const course = await api.post<CourseDto>('/courses', {
        name: values.name.trim(),
        color: values.color,
      });
      onCreated(course);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('courses.create.title')} onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <InputField
          label={t('courses.create.nameLabel')}
          type="text"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          autoFocus
        />
        <CourseColorField
          value={values.color}
          error={errors.color}
          onChange={(color) => handleChange('color', color)}
        />
        <Button type="submit" className="w-100" loading={loading}>
          {t('courses.create.submit')}
        </Button>
      </Form>
    </Modal>
  );
}
