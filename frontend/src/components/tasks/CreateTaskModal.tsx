import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/layout/Modal';
import Form from '../shared/form/Form';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import Button from '../shared/Button';
import { api } from '../../services/api';
import { TaskDto } from '../../types/dto';
import { useForm } from '../../hooks/useForm';
import { createCreateTaskSchema } from '../../validation/schemas';

interface CreateTaskModalProps {
  courseId: string;
  onClose: () => void;
  onCreated: (task: TaskDto) => void;
}

export default function CreateTaskModal({ courseId, onClose, onCreated }: CreateTaskModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const priorityOptions = [
    { value: 'LOW', label: t('tasks.priority.LOW') },
    { value: 'MEDIUM', label: t('tasks.priority.MEDIUM') },
    { value: 'HIGH', label: t('tasks.priority.HIGH') },
  ];

  const schema = useMemo(() => createCreateTaskSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
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
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('tasks.create.title')} onClose={onClose}>
      <Form onSubmit={handleSubmit} error={error}>
        <InputField
          label={t('tasks.fields.title')}
          type="text"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          autoFocus
        />
        <TextareaField
          label={t('tasks.fields.description')}
          value={values.description ?? ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
        <InputField
          label={t('tasks.fields.dueDate')}
          type="date"
          value={values.dueDate ?? ''}
          onChange={(e) => handleChange('dueDate', e.target.value)}
        />
        <SelectField
          label={t('tasks.fields.priority')}
          value={values.priority ?? 'MEDIUM'}
          onChange={(e) => handleChange('priority', e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
          options={priorityOptions}
        />
        <Button type="submit" className="w-100" loading={loading}>
          {t('tasks.create.submit')}
        </Button>
      </Form>
    </Modal>
  );
}
