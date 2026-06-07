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
import { createEditTaskSchema } from '../../validation/schemas';

interface EditTaskModalProps {
  task: TaskDto;
  onClose: () => void;
  onUpdated: (task: TaskDto) => void;
}

export default function EditTaskModal({ task, onClose, onUpdated }: EditTaskModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const priorityOptions = [
    { value: 'LOW', label: t('tasks.priority.LOW') },
    { value: 'MEDIUM', label: t('tasks.priority.MEDIUM') },
    { value: 'HIGH', label: t('tasks.priority.HIGH') },
  ];

  const statusOptions = [
    { value: 'OPEN', label: t('tasks.status.OPEN') },
    { value: 'IN_PROGRESS', label: t('tasks.status.IN_PROGRESS') },
    { value: 'DONE', label: t('tasks.status.DONE') },
  ];

  const schema = useMemo(() => createEditTaskSchema(t), [t]);
  const { values, errors, handleChange, validate } = useForm(schema, {
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
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={t('tasks.edit.title')} onClose={onClose}>
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
          value={values.priority}
          onChange={(e) => handleChange('priority', e.target.value as TaskDto['priority'])}
          options={priorityOptions}
        />
        <SelectField
          label={t('tasks.fields.status')}
          value={values.status}
          onChange={(e) => handleChange('status', e.target.value as TaskDto['status'])}
          options={statusOptions}
        />
        <Button type="submit" className="w-100" loading={loading}>
          {t('tasks.edit.submit')}
        </Button>
      </Form>
    </Modal>
  );
}
