import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AuthResponse } from '../types/dto';
import Button from '../components/shared/Button';
import Logo from '../components/shared/Logo';
import Form from '../components/shared/form/Form';
import InputField from '../components/shared/form/InputField';
import PasswordField from '../components/shared/form/PasswordField';
import { useForm } from '../hooks/useForm';
import { loginSchema } from '../validation/schemas';

/**
 * LoginPage
 *
 * Provides the user interface for user authentication.
 *
 * Responsibilities:
 * - Render login form (identifier + password)
 * - Validate user input using Zod schema
 * - Send login request to backend API
 * - Store authentication data via AuthContext
 * - Redirect user after successful login
 * - Display loading state and error messages
 * - Display loading state, error messages, and logout feedback
 *
 * Workflow:
 * 1. User enters email/username and password
 * 2. Form is validated using loginSchema
 * 3. API request is sent to /auth/login
 * 4. JWT token and user data are stored via AuthContext
 * 5. User is redirected to the home page
 */
export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [logoutMessage, setLogoutMessage] = useState('');

  useEffect(() => {
    const message = sessionStorage.getItem('logoutMessage');
    if (message) {
      setLogoutMessage(message);
      sessionStorage.removeItem('logoutMessage');
    }
  }, []);

  // Initialize form with validation schema
  const { values, errors, handleChange, validate } = useForm(loginSchema, {
    identifier: '',
    password: '',
  });

  /**
   * Handles form submission.
   *
   * - Prevents default form behavior
   * - Validates input fields
   * - Sends login request to backend
   * - Stores auth data and redirects user
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        identifier: values.identifier,
        password: values.password,
      });

      // Store token and user in AuthContext
      login(data.token, data.user);

      // Redirect to home/dashboard
      navigate('/');
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
          <h5 className="text-center mb-3">Sign In</h5>

          {logoutMessage && (
            <div className="alert alert-success" role="alert">
              {logoutMessage}
            </div>
          )}

          <Form onSubmit={handleSubmit} error={error}>
            {/* Identifier (Email or Username) */}
            <InputField
              label="Email or Username"
              type="text"
              value={values.identifier}
              onChange={(e) => handleChange('identifier', e.target.value)}
              error={errors.identifier}
              autoComplete="username"
            />

            {/* Password */}
            <PasswordField
              label="Password"
              showToggle={false}
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Submit button */}
            <Button type="submit" className="w-100" loading={loading}>
              Login
            </Button>
          </Form>

          {/* Navigation links */}
          <div className="text-center mt-3">
            <Link to="/register">Need an account? Register</Link>
          </div>
          <div className="text-center mt-2">
            <Link to="/forgot-password" className="text-muted" style={{ fontSize: '14px' }}>
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
