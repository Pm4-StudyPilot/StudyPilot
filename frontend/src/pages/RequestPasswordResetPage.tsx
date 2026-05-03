import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { requestPasswordResetSchema } from '../validation/schemas';

export default function RequestPasswordResetPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(requestPasswordResetSchema, {
    email: '',
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<{ message: string }>('/auth/request-password-reset', {
        email: values.email,
      });
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--narrow auth-card--themed card">
        <div className="card-body p-4">
          <div className="auth-card__brand-wrap">
            <h2 className="text-center mb-4">
              <Logo className="auth-card__brand" />
            </h2>
          </div>
          <p className="auth-card__eyebrow">Recovery</p>
          <h5 className="auth-card__title text-center mb-1">Forgot Password</h5>
          <p className="auth-card__lead text-center mb-4">
            Enter your email and we'll send you a reset link.
          </p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3 auth-card__footer-link">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          ) : (
            <>
              <Form onSubmit={handleSubmit} error={error}>
                <InputField
                  label="Email Address"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                <Button type="submit" className="w-100" loading={loading}>
                  Send Reset Link
                </Button>
              </Form>
              <div className="text-center mt-3 auth-card__footer-link">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
