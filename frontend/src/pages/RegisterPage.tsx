import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Button from '../components/shared/Button';
import Form from '../components/shared/form/Form';
import Modal from '../components/shared/layout/Modal';
import InputField from '../components/shared/form/InputField';
import PasswordField from '../components/shared/form/PasswordField';
import ProgressBar from '../components/shared/feedback/ProgressBar';
import Logo from '../components/shared/Logo';
import { useForm } from '../hooks/useForm';
import { registerSchema } from '../validation/schemas';
import { getPasswordChecks, getPasswordStrength } from '../utils/passwordStrength';
import { AuthResponse } from '../types/dto';

/**
 * Response type for availability checks.
 *
 * - emailExists: true if the email address is already in use
 * - usernameExists: true if the username is already in use
 */
type AvailabilityResponse = {
  emailExists?: boolean;
  usernameExists?: boolean;
};

/**
 * RegisterPage
 *
 * Displays the user registration form and handles account creation.
 *
 * Features:
 * - Shared form fields for email, username, password and confirm password
 * - Client-side validation using Zod schema and custom useForm hook
 * - Live password requirement feedback
 * - Live confirm-password match feedback
 * - Password strength indicator
 * - Live availability check for email and username
 * - Form submission to backend API
 * - Automatic login after successful registration
 * - Redirect to home page after success
 * - Server-side error display
 * - Loading state during request
 *
 * Workflow:
 * 1. User enters email, username, password and confirm password
 * 2. Client-side validation checks the form input
 * 3. Password requirements and password match are displayed live
 * 4. Email availability is checked once the input has a valid basic format
 * 5. Username availability are checked with a short delay while typing
 * 6. If valid, a registration request is sent to the backend
 * 7. On success:
 *    - User is logged in
 *    - Redirect to home page
 * 8. On failure:
 *    - Server error message is displayed
 *
 * @returns Registration page component
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const { values, errors, handleChange, validate } = useForm(registerSchema, {
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const passwordChecks = getPasswordChecks(values.password);
  const passwordsMatch =
    values.confirmPassword.length > 0 && values.password === values.confirmPassword;

  /**
   * Checks whether the given email already exists.
   *
   * @param email Email address to check
   */
  async function checkEmailAvailability(email: string) {
    setCheckingEmail(true);

    try {
      const result = await api.post<AvailabilityResponse>('/auth/check-availability', { email });
      setEmailExists(result.emailExists ?? null);
    } catch {
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  }

  /**
   * Checks whether the given username already exists.
   *
   * @param username Username to check
   */
  async function checkUsernameAvailability(username: string) {
    setCheckingUsername(true);

    try {
      const result = await api.post<AvailabilityResponse>('/auth/check-availability', { username });
      setUsernameExists(result.usernameExists ?? null);
    } catch {
      setUsernameExists(null);
    } finally {
      setCheckingUsername(false);
    }
  }

  /**
   * Triggers a live availability check for email addresses.
   *
   * The check only runs if the field is not empty and the email
   * already has a valid basic format.
   */
  useEffect(() => {
    if (!values.email) {
      setEmailExists(null);
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);

    if (!isValidEmail) {
      setEmailExists(null);
      return;
    }

    checkEmailAvailability(values.email);
  }, [values.email]);

  /**
   * Triggers a debounced live availability check for usernames.
   *
   * The check only runs if the username has at least 3 characters.
   * A short delay is used to avoid sending a request on every keystroke.
   */
  useEffect(() => {
    if (!values.username || values.username.length < 3) {
      setUsernameExists(null);
      return;
    }

    const timer = setTimeout(() => {
      checkUsernameAvailability(values.username);
    }, 400);

    return () => clearTimeout(timer);
  }, [values.username]);

  /**
   * Handles form submission for user registration.
   *
   * @param e Form submission event
   *
   * Workflow:
   * - Prevent default form submission
   * - Run client-side validation
   * - Prevent submission if email or username is already taken
   * - Reset previous server error
   * - Send registration request to backend
   * - On success:
   *    - Store token and user via AuthContext
   *    - Redirect to home page
   * - On failure:
   *    - Display server error message
   * - Always reset loading state
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate()) return;

    if (emailExists || usernameExists) {
      setServerError('Please choose a different e-mail or username');
      return;
    }

    setServerError('');
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/register', {
        email: values.email,
        username: values.username,
        password: values.password,
      });

      login(data.token, data.user);
      navigate('/');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Create Account"
      header={<Logo />}
      footer={<Link to="/login">Already have an account? Sign in</Link>}
    >
      {serverError && <div className="alert alert-danger">{serverError}</div>}

      <Form onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          autoComplete="email"
        />

        {checkingEmail && <div className="small text-muted mt-1">Checking e-mail...</div>}
        {emailExists === true && (
          <div className="small text-danger mt-1">✖ E-mail already exists</div>
        )}
        {emailExists === false && values.email && !errors.email && (
          <div className="small text-success mt-1">✔ E-mail is available</div>
        )}

        <InputField
          label="Username"
          type="text"
          value={values.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          autoComplete="username"
        />

        {checkingUsername && <div className="small text-muted mt-1">Checking username...</div>}
        {usernameExists === true && (
          <div className="small text-danger mt-1">✖ Username already exists</div>
        )}
        {usernameExists === false && values.username.length >= 3 && !errors.username && (
          <div className="small text-success mt-1">✔ Username is available</div>
        )}

        <PasswordField
          label="Password"
          value={values.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        <ProgressBar value={getPasswordStrength(values.password)} />

        <div className="mt-2 mb-3 small">
          <div className={passwordChecks.minLength ? 'text-success' : 'text-danger'}>
            {passwordChecks.minLength ? '✔' : '✖'} At least 12 characters
          </div>
          <div className={passwordChecks.uppercase ? 'text-success' : 'text-danger'}>
            {passwordChecks.uppercase ? '✔' : '✖'} At least one uppercase letter
          </div>
          <div className={passwordChecks.lowercase ? 'text-success' : 'text-danger'}>
            {passwordChecks.lowercase ? '✔' : '✖'} At least one lowercase letter
          </div>
          <div className={passwordChecks.number ? 'text-success' : 'text-danger'}>
            {passwordChecks.number ? '✔' : '✖'} At least one number
          </div>
          <div className={passwordChecks.specialChar ? 'text-success' : 'text-danger'}>
            {passwordChecks.specialChar ? '✔' : '✖'} At least one special character
          </div>
        </div>

        <PasswordField
          label="Confirm Password"
          value={values.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        {values.confirmPassword && (
          <div className={`mb-3 small ${passwordsMatch ? 'text-success' : 'text-danger'}`}>
            {passwordsMatch ? '✔' : '✖'} Passwords match
          </div>
        )}

        <Button type="submit" className="w-100" loading={loading}>
          Register
        </Button>
      </Form>
    </Modal>
  );
}
