import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { AuthResponse } from "../types/dto";
import Button from "../components/shared/Button";
import Logo from "../components/shared/Logo";

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
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    setError("");
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>("/auth/register", { 
        email, 
        username, 
        password 
      });

      // Store authentication state
      login(data.token, data.user);

      // Redirect to home page
      navigate("/");
    } catch (err: unknown) {
      // Handle error message
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4">
            <Logo />
          </h2>
          <h5 className="text-center mb-3">Create Account</h5>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">E-Mail</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-100" loading={loading}>
              Register
            </Button>
          </form>

          <div className="text-center mt-3">
            <Link to="/login">Already have an account? Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
