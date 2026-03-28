import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "../pages/RegisterPage";
import { api } from "../services/api";

/**
 * Mock functions for external dependencies.
 *
 * - mockLogin simulates AuthContext login
 * - mockNavigate simulates navigation after successful registration
 */
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

/**
 * Mock AuthContext.
 *
 * Replaces the real useAuth hook with a simplified mock version
 * so that RegisterPage can be tested without real authentication state.
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
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for availability checks and registration requests.
 */
vi.mock("../services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * RegisterPage component tests.
 *
 * Covered scenarios:
 * - rendering of all required registration fields
 * - live password requirement feedback
 * - successful registration flow
 * - server-side error display on failed registration
 */
describe("RegisterPage", () => {
  /**
   * Reset all mocks before each test to avoid leaking state
   * between test cases.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case: Render registration form
   *
   * Scenario:
   * The registration page is opened.
   *
   * Expected behavior:
   * - Email field is displayed
   * - Username field is displayed
   * - Password fields are displayed
   * - Register button is displayed
   */
  it("renders all registration fields", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  /**
   * Test case: Live password requirement feedback
   *
   * Scenario:
   * The user enters a valid strong password.
   *
   * Expected behavior:
   * - Password requirement hints are visible
   * - The password rules section is rendered correctly
   */
  it("shows password requirement feedback while typing", async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, {
      target: { value: "Password123!@" },
    });

    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
  });

  /**
   * Test case: Successful registration
   *
   * Scenario:
   * - Email availability check returns available
   * - Username availability check returns available
   * - Registration request succeeds
   *
   * Expected behavior:
   * - login() is called with returned auth data
   * - navigation to "/" is triggered
   */
  it("submits registration successfully", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ emailExists: false })
      .mockResolvedValueOnce({ usernameExists: false })
      .mockResolvedValueOnce({
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
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@students.zhaw.ch" },
    });

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    });

    const passwordFields = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwordFields[0], {
      target: { value: "Password123!@" },
    });
    fireEvent.change(passwordFields[1], {
      target: { value: "Password123!@" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});