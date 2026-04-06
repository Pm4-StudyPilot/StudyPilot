import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { requestPasswordResetSchema } from '../validation/schemas';

/**
 * RequestPasswordResetPage
 *
 * Allows unauthenticated users to request a password reset email.
 *
 * Responsibilities:
 * - Render the "Forgot Password" form (email field)
 * - Validate input using Zod schema
 * - Send POST request to /auth/request-password-reset
 * - Display a generic success message regardless of whether the email exists
 *
 * Workflow:
 * 1. User enters their registered email address
 * 2. Form is validated using requestPasswordResetSchema
 * 3. API request is sent to /auth/request-password-reset
 * 4. Generic confirmation message is shown (prevents email enumeration)
 */
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
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4">
            <Logo />
          </h2>
          <h5 className="text-center mb-1">Forgot Password</h5>
          <p className="text-muted text-center mb-4" style={{ fontSize: '14px' }}>
            Enter your email and we'll send you a reset link.
          </p>

          {success ? (
            <>
              <div className="alert alert-success" role="alert">
                {success}
              </div>
              <div className="text-center mt-3">
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
              <div className="text-center mt-3">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
