import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import Button from "../components/shared/Button";
import Form from "../components/shared/form/Form";
import Modal from "../components/shared/layout/Modal";
import InputField from "../components/shared/form/InputField";
import PasswordField from "../components/shared/form/PasswordField";
import ProgressBar from "../components/shared/feedback/ProgressBar";
import Logo from "../components/shared/Logo";
import { useForm } from "../hooks/useForm";
import { registerSchema } from "../validation/schemas";
import { getPasswordStrength } from "../utils/passwordStrength";
import { AuthResponse } from "../types/dto";

/**
 * RegisterPage
 *
 * Displays the user registration form and handles account creation.
 *
 * Features:
 * - Shared form fields for email, username, password and confirm password
 * - Client-side validation using Zod schema and custom useForm hook
 * - Password strength indicator
 * - Form submission to backend API
 * - Automatic login after successful registration
 * - Redirect to home page after success
 * - Server-side error display
 * - Loading state during request
 *
 * Workflow:
 * 1. User enters email, username, password and confirm password
 * 2. Client-side validation checks the form input
 * 3. If valid, a registration request is sent to the backend
 * 4. On success:
 *    - User is logged in
 *    - Redirect to home page
 * 5. On failure:
 *    - Server error message is displayed
 *
 * @returns Registration page component
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, validate } = useForm(registerSchema, {
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  /**
   * Handles form submission for user registration.
   *
   * @param e Form submission event
   *
   * Workflow:
   * - Prevent default form submission
   * - Run client-side validation
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
    setServerError("");
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>("/auth/register", {
        email: values.email,
        username: values.username,
        password: values.password,
      });

      login(data.token, data.user);
      navigate("/");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal 
      disableClose={true} 
      title="Create Account" 
      header={<Logo/>} 
      footer={<Link to="/login">Already have an account? Sign in</Link>}
    >
    {serverError && <div className="alert alert-danger">{serverError}</div>}
      
      <Form onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          autoComplete="email"
        />

        <InputField
          label="Username"
          type="text"
          value={values.username}
          onChange={(e) => handleChange("username", e.target.value)}
          error={errors.username}
          autoComplete="username"
        />

        <PasswordField
          label="Password"
          value={values.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        <ProgressBar value={getPasswordStrength(values.password)} />

        <PasswordField
          label="Confirm Password"
          value={values.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-100" loading={loading}>
          Register
        </Button>
      </Form>
    </Modal>
  );
}
