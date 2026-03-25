import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { AuthResponse } from "../types/dto";
import Button from "../components/shared/Button";
import Logo from "../components/shared/Logo";
import Form from "../components/shared/Form";
import InputField from "../components/shared/InputField";
import PasswordField from "../components/shared/PasswordField";
import { useForm } from "../hooks/useForm";
import { loginSchema } from "../validation/schemas";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { values, errors, handleChange, validate } = useForm(loginSchema, {
    email: "",
    password: "",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>("/auth/login", {
        email: values.email,
        password: values.password,
      });
      login(data.token, data.user);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4"><Logo /></h2>
          <h5 className="text-center mb-3">Sign In</h5>

          <Form onSubmit={handleSubmit} error={error}>
            <InputField
              label="Email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <PasswordField
              label="Password"
              showToggle={false}
              value={values.password}
              onChange={(e) => handleChange("password", e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button type="submit" className="w-100" loading={loading}>
              Login
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Link to="/register">Need an account? Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
