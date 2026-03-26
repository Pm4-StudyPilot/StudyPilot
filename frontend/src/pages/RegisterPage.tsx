import { FormEvent } from "react";
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
import { useForm } from "../hooks/useForm"
import { registerSchema } from "../validation/schemas"
import { getPasswordStrength } from "../utils/passwordStrength";
import { AuthResponse } from "../types/dto";

/**
 * RegisterPage
 * 
 * Displays the user registration form and handles account creation.
 * 
 * Features:
 * - Input fields for e-mail, username and password
 * - Form submission to backend API (/auth/register)
 * - Automated login after successful registration
 * - Error handling and loading state
 * - Navigation to login page
 * 
 * Workflow:
 * 1. User enters e-mail, username and password
 * 2. Form is submitted
 * 3. API request is sent to backend
 * 4. On success:
 *    - User is logged in
 *    - Redirect to home page
 * 5. On error:
 *    - Error message is displayed
 * 
 * @returns 
 */

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
   * - Prevent default form behavior
   * - Reset error state
   * - Set loading state
   * - Send POST request to /auth/register
   * - On success:
   *    - Store token and user via AuthContext
   *    - Redirect to home page
   * - On failure:
   *    - Display error message
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = await api.post<AuthResponse>("/auth/register", {
      email: values.email,
      username: values.username,
      password: values.password,
    });

    login(data.token, data.user);
    navigate("/");
  }

  return (
    <Modal disableClose={true} title="Create Account" header={<Logo/>} footer={<Link to="/login">Already have an account? Sign in</Link>}>
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

        <ProgressBar value={getPasswordStrength(values.password)}/>

        <PasswordField
          label="Confirm Password"
          value={values.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-100">
          Register
        </Button>
      </Form>
    </Modal>
  );
}
