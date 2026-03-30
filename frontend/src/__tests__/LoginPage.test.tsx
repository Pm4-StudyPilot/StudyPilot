import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import { api } from "../services/api";

/**
 * Mock functions for external dependencies.
 *
 * - mockLogin simulates AuthContext login
 * - mockNavigate simulates navigation after successful login
 */
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

/**
 * Mock AuthContext.
 *
 * Replaces the real useAuth hook with a simplified mock version
 * so that LoginPage can be tested without real authentication state.
 */
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

/**
 * Mock react-router-dom navigation while keeping the other real exports.
 *
 * MemoryRouter is still used as normal router wrapper in tests,
 * but useNavigate is replaced so navigation can be asserted.
 */
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for login requests.
 */
vi.mock("../services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * LoginPage component tests.
 *
 * Covered scenarios:
 * - rendering of all required login fields
 * - successful login flow
 * - server-side error display on failed login
 * - client-side validation prevents empty submission
 */
describe("LoginPage", () => {
  /**
   * Reset all mocks before each test to avoid leaking state
   * between test cases.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

    afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Render login form
   *
   * Scenario:
   * The login page is opened.
   *
   * Expected behavior:
   * - Identifier field is displayed
   * - Password field is displayed
   * - Login button is displayed
   */
  it("renders all login fields", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  /**
   * Test case: Successful login
   *
   * Scenario:
   * A valid identifier and password are entered
   * and the backend returns a token and user object.
   *
   * Expected behavior:
   * - API is called with identifier and password
   * - AuthContext login() is called with returned auth data
   * - Navigation to "/" is triggered
   */
  it("submits login successfully", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      token: "fake-token",
      user: {
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        role: "student",
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: { value: "testuser" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Strong@Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        identifier: "testuser",
        password: "Strong@Password123!",
      });

      expect(mockLogin).toHaveBeenCalledWith("fake-token", {
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        role: "student",
      });

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  /**
   * Test case: Failed login
   *
   * Scenario:
   * The backend rejects the login request with an error.
   *
   * Expected behavior:
   * - API request is made
   * - Error message is displayed to the user
   * - AuthContext login() is not called
   * - Navigation is not triggered
   */
  it("shows an error message if login fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Invalid credentials"));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email or username/i), {
      target: { value: "testuser" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "WrongPassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  /**
   * Test case: Empty form submission
   *
   * Scenario:
   * The login button is clicked without entering any values.
   *
   * Expected behavior:
   * - Client-side validation blocks submission
   * - API is not called
   * - Validation messages are displayed
   */
  it("should not submit if required fields are empty", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email or username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});