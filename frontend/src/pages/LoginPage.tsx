import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { AuthResponse } from "../types/dto";
import Button from "../components/shared/Button";
import Logo from "../components/shared/Logo";
import Form from "../components/shared/Form";
import InputField from "../components/shared/InputField";
import Modal from "../components/shared/Modal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>("/auth/login", { email, password });
      login(data.token, data.user);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal disableClose={true} title="Login" header={<Logo/>} footer={<Link to="/register">Need an account? Register</Link>}>
          <Form onSubmit={handleSubmit} error={error}>
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="w-100" loading={loading}>
              Login
            </Button>
          </Form>
      </Modal>
  );
}
